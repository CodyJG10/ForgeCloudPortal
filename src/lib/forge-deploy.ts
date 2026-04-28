import { execa } from "execa";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { DeployLogger } from "@/lib/deploy-logger";
import {
  createGithubRepo,
  buildAuthPushUrl,
  buildRepoInitCommand,
  buildRepoInitCommandRedacted,
} from "@/lib/github";
import { withSsh } from "@/lib/ssh";
import { NodeSSH } from "node-ssh";
import { encryptSecret } from "@/lib/crypto";

type DeployInput = {
  jobId?: string;         // DeploymentJob id for live progress tracking
  projectName: string;
  repoName: string;       // GitHub repo name — repo URL is derived from this
  branch: string;
  siteName: string;
  domain: string;
  frontendDomain?: string;
  sslEmail: string;
  dbName: string;
  dbUsername: string;
  dbPassword: string;
  strapiAppKeys: string;
  strapiAdminJwtSecret: string;
  strapiJwtSecret: string;
  strapiApiTokenSalt: string;
  strapiTransferTokenSalt: string;
  strapiEncryptionKey: string;
  deployFrontendVps: boolean;
  server: {
    id: string;
    host: string;
    username: string;
    port: number;
    privateKey?: string;
    password?: string;
  };
  actorId?: string;
};

function varsYaml(input: DeployInput, repoUrl: string) {
  return `site_name: "${input.siteName}"
repo_url: "${repoUrl}"
branch: "${input.branch}"
domain_name: "${input.domain}"
ssl_email: "${input.sslEmail}"

db_name: "${input.dbName}"
db_username: "${input.dbUsername}"
db_password: "${input.dbPassword}"

strapi_app_keys: "${input.strapiAppKeys}"
strapi_admin_jwt_secret: "${input.strapiAdminJwtSecret}"
strapi_jwt_secret: "${input.strapiJwtSecret}"
strapi_api_token_salt: "${input.strapiApiTokenSalt}"
strapi_transfer_token_salt: "${input.strapiTransferTokenSalt}"
strapi_encryption_key: "${input.strapiEncryptionKey}"

deploy_frontend_vps: ${input.deployFrontendVps}
frontend_domain: "${input.frontendDomain ?? ""}"
public_strapi_url: "https://${input.domain}"
`;
}

/** Returns a random unprivileged port in the range 10000–19999 */
function randomPort() {
  return 10000 + Math.floor(Math.random() * 10000);
}

async function updateJob(jobId: string | undefined, log: DeployLogger, status: "RUNNING" | "SUCCESS" | "FAILED", projectId?: string) {
  if (!jobId) return;
  try {
    await prisma.deploymentJob.update({
      where: { id: jobId },
      data: { status, log: log.dump(), ...(projectId ? { projectId } : {}) },
    });
  } catch {
    // Non-fatal — log loss is better than crashing the deploy
  }
}

export async function deployForgeProject(input: DeployInput) {
  const log = new DeployLogger();

  log.step(`Starting deployment: project="${input.projectName}" site="${input.siteName}" server=${input.server.host}`);
  await updateJob(input.jobId, log, "RUNNING");

  // ── Phase 1: Create GitHub repo ──────────────────────────────────────────
  let repoUrl: string;
  try {
    repoUrl = await createGithubRepo(input.repoName, log);
  } catch (err) {
    log.fail(`Phase 1 failed — could not create GitHub repo: ${err instanceof Error ? err.message : String(err)}`);
    await updateJob(input.jobId, log, "FAILED");
    return { ok: false, output: log.dump() };
  }

  // ── Phase 2: Mirror ForgeTemplate → new repo from VPS ───────────────────
  log.step(`Phase 2: Cloning ForgeTemplate on VPS and pushing to new repo`);
  const authPushUrl = buildAuthPushUrl(repoUrl);
  const initCmd = buildRepoInitCommand(input.siteName, authPushUrl);
  const initCmdRedacted = buildRepoInitCommandRedacted(input.siteName, repoUrl);
  log.info(`VPS command (token redacted): ${initCmdRedacted}`);

  try {
    // We need a raw SSH connection here (not runCommand) so we can capture output cleanly
    const vpsServer = await prisma.vpsServer.findUnique({ where: { id: input.server.id } });
    if (!vpsServer) throw new Error("Server record not found in DB");

    const sshResult = await withSsh(vpsServer, async (ssh: NodeSSH) => {
      return ssh.execCommand(initCmd);
    });

    if (sshResult.stdout) log.info(`VPS stdout:\n${sshResult.stdout}`);
    if (sshResult.stderr) log.info(`VPS stderr:\n${sshResult.stderr}`);

    if (sshResult.code !== 0) {
      log.fail(`Phase 2 failed — git mirror exited ${sshResult.code}`);
      await updateJob(input.jobId, log, "FAILED");
      return { ok: false, output: log.dump() };
    }
    log.ok(`ForgeTemplate mirrored to ${repoUrl}`);
    await updateJob(input.jobId, log, "RUNNING");
  } catch (err) {
    log.fail(`Phase 2 failed — SSH error: ${err instanceof Error ? err.message : String(err)}`);
    await updateJob(input.jobId, log, "FAILED");
    return { ok: false, output: log.dump() };
  }

  // ── Phase 3: Write temp vars + SSH key ──────────────────────────────────
  log.step("Phase 3: Writing Ansible vars and SSH key to temp directory");

  // Embed the GitHub token in repo_url so Ansible's git clone doesn't hang
  // waiting for credentials. The token never leaves the temp vars.yml file.
  const authRepoUrl = buildAuthPushUrl(repoUrl);
  let tempDir: string;
  let varsPath: string;
  let keyPath: string | null = null;

  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-vars-"));
    varsPath = path.join(tempDir, "vars.yml");
    await fs.writeFile(varsPath, varsYaml(input, authRepoUrl), "utf8");
    log.ok(`Temp dir: ${tempDir}`);
    log.info(`vars.yml written to ${varsPath} (repo_url contains auth token for private repo)`);

    if (input.server.privateKey) {
      keyPath = path.join(tempDir, "id_ed25519");
      await fs.writeFile(keyPath, input.server.privateKey, { mode: 0o600 });
      log.info(`SSH key written to ${keyPath}`);
    } else {
      log.info("Using password auth — no key file written");
    }
    await updateJob(input.jobId, log, "RUNNING");
  } catch (err) {
    log.fail(`Phase 3 failed — could not write temp files: ${err instanceof Error ? err.message : String(err)}`);
    await updateJob(input.jobId, log, "FAILED");
    return { ok: false, output: log.dump() };
  }

  // ── Phase 4: Run Ansible playbook ───────────────────────────────────────
  log.step("Phase 4: Running Ansible playbook");
  const forgeRoot = process.env.FORGE_TEMPLATE_PATH ?? "../ForgeTemplate";
  const playbook = path.join(forgeRoot, "infrastructure/ansible/deploy.yml");

  // Write a minimal inventory file so the playbook's `hosts: strapi_servers` group matches.
  // All host vars must be on ONE line in INI inventory format — continuation lines are not supported.
  const inventoryPath = path.join(tempDir!, "inventory.ini");
  const baseVars = `ansible_host=${input.server.host} ansible_user=${input.server.username} ansible_port=${input.server.port}`;
  const authVars = keyPath
    ? `ansible_ssh_private_key_file=${keyPath}`
    : `ansible_password=${input.server.password} ansible_ssh_extra_args="-o StrictHostKeyChecking=no -o PubkeyAuthentication=no"`;
  const inventoryContent = `[strapi_servers]\ntarget ${baseVars} ${authVars}\n`;
  await fs.writeFile(inventoryPath, inventoryContent, "utf8");

  log.info(`forgeRoot: ${forgeRoot}`);
  log.info(`playbook:  ${playbook}`);
  log.info(`inventory: ${inventoryPath}`);
  log.info(`inventory content:\n${inventoryContent.replace(input.server.password ?? "", "***")}`);
  log.info(`ansible_host=${input.server.host} ansible_user=${input.server.username} ansible_port=${input.server.port} auth=${keyPath ? "key" : "password"}`);
  await updateJob(input.jobId, log, "RUNNING");

  const args = [
    playbook,
    "-i", inventoryPath,
    "-e", `@${varsPath}`,
  ];

  try {
    // Stream Ansible output to the DB every 3 s so the status page stays live
    const subprocess = execa("ansible-playbook", args, {
      cwd: forgeRoot,
      all: true,
      timeout: 15 * 60 * 1000,
      reject: false,
    });

    let pendingOutput = "";
    const flushToDb = async () => {
      if (!pendingOutput) return;
      log.info(pendingOutput);
      pendingOutput = "";
      await updateJob(input.jobId, log, "RUNNING");
    };
    const flushInterval = setInterval(flushToDb, 3000);

    subprocess.stdout?.on("data", (chunk: Buffer) => { pendingOutput += chunk.toString(); });
    subprocess.stderr?.on("data", (chunk: Buffer) => { pendingOutput += chunk.toString(); });

    const result = await subprocess;
    clearInterval(flushInterval);
    await flushToDb(); // flush any remaining buffered output

    log.info(`Ansible exit code: ${result.exitCode}`);

    if (result.exitCode !== 0) {
      log.fail(`Phase 4 failed — ansible-playbook exited ${result.exitCode}`);
      await updateJob(input.jobId, log, "FAILED");
      await fs.rm(tempDir!, { recursive: true, force: true });
      return { ok: false, output: log.dump() };
    }

    log.ok("Ansible playbook completed successfully");
    await updateJob(input.jobId, log, "RUNNING");

    // ── Phase 5: Save project to DB ─────────────────────────────────────
    log.step("Phase 5: Reading deployed ports from VPS and saving project to database");

    // Read the actual ports Ansible wrote into the .env — never guess with randomPort()
    const vpsServerRecord = await prisma.vpsServer.findUnique({ where: { id: input.server.id } });
    if (!vpsServerRecord) throw new Error("Server record not found");
    const envPath = `/opt/strapi-sites/${input.siteName}/repo/Backend/.env`;
    const portResult = await withSsh(vpsServerRecord, async (ssh: NodeSSH) => {
      const r = await ssh.execCommand(
        `grep -E '^(STRAPI_PORT|ADMINER_PORT|FRONTEND_PORT)=' '${envPath}'`
      );
      return r.stdout;
    });
    const parseEnvInt = (key: string) => {
      const m = portResult.match(new RegExp(`^${key}=(\\d+)`, "m"));
      return m ? parseInt(m[1], 10) : null;
    };
    const strapiPort = parseEnvInt("STRAPI_PORT");
    const adminerPort = parseEnvInt("ADMINER_PORT");
    const frontendPort = parseEnvInt("FRONTEND_PORT");
    log.info(`Ports read from VPS .env — strapi=${strapiPort} adminer=${adminerPort} frontend=${frontendPort}`);

    const project = await prisma.project.create({
      data: {
        name: input.projectName,
        siteName: input.siteName,
        repoUrl,
        branch: input.branch,
        domain: input.domain,
        frontendDomain: input.frontendDomain,
        serverId: input.server.id,
        deployFrontendVps: input.deployFrontendVps,
        backendPath: `/opt/strapi-sites/${input.siteName}/repo/Backend`,
        frontendPath: input.deployFrontendVps ? `/opt/strapi-sites/${input.siteName}/repo/Frontend` : null,
        envBackendPath: `/opt/strapi-sites/${input.siteName}/repo/Backend/.env`,
        envFrontendPath: input.deployFrontendVps ? `/opt/strapi-sites/${input.siteName}/repo/Frontend/.env` : null,
        strapiPort,
        adminerPort,
        frontendPort: input.deployFrontendVps ? frontendPort : null,
        dbName: input.dbName,
        dbUsername: input.dbUsername,
        dbPasswordEnc: encryptSecret(input.dbPassword),
      },
    });
    log.ok(`Project saved: id=${project.id}`);

    // ── Phase 6: Save activity log ──────────────────────────────────────
    log.step("Phase 6: Writing activity log");
    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        actorId: input.actorId,
        action: "DEPLOY_FROM_PORTAL",
        output: log.dump().slice(-20000),
      },
    });
    log.ok("Activity log saved");

    await fs.rm(tempDir!, { recursive: true, force: true });
    await updateJob(input.jobId, log, "SUCCESS", project.id);
    return { ok: true, output: log.dump(), projectId: project.id };
  } catch (error) {
    log.fail(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    await fs.rm(tempDir!, { recursive: true, force: true }).catch(() => {});
    await updateJob(input.jobId, log, "FAILED");
    return { ok: false, output: log.dump() };
  }
}

