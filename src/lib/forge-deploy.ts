import { execa } from "execa";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/prisma";

type DeployInput = {
  projectName: string;
  repoUrl: string;
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
    privateKey: string;
  };
  actorId?: string;
};

function varsYaml(input: DeployInput) {
  return `site_name: "${input.siteName}"
repo_url: "${input.repoUrl}"
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
`;
}

export async function deployForgeProject(input: DeployInput) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-vars-"));
  const varsPath = path.join(tempDir, "vars.yml");
  const keyPath = path.join(tempDir, "id_ed25519");
  await fs.writeFile(varsPath, varsYaml(input), "utf8");
  await fs.writeFile(keyPath, input.server.privateKey, { mode: 0o600 });

  const forgeRoot = process.env.FORGE_TEMPLATE_PATH ?? "../ForgeTemplate";
  const inventory = path.join(forgeRoot, "infrastructure/ansible/inventory.example");
  const playbook = path.join(forgeRoot, "infrastructure/ansible/deploy.yml");

  const args = [
    playbook,
    "-i",
    inventory,
    "-e",
    `@${varsPath}`,
    "-e",
    `ansible_host=${input.server.host}`,
    "-e",
    `ansible_user=${input.server.username}`,
    "-e",
    `ansible_port=${input.server.port}`,
    "-e",
    `ansible_ssh_private_key_file=${keyPath}`,
  ];

  try {
    const result = await execa("ansible-playbook", args, {
      cwd: forgeRoot,
      all: true,
      timeout: 15 * 60 * 1000,
      reject: false,
    });

    if (result.exitCode !== 0) {
      return {
        ok: false,
        output: result.all ?? result.stderr ?? "Deploy failed",
      };
    }

    const project = await prisma.project.create({
      data: {
        name: input.projectName,
        siteName: input.siteName,
        repoUrl: input.repoUrl,
        branch: input.branch,
        domain: input.domain,
        frontendDomain: input.frontendDomain,
        serverId: input.server.id,
        deployFrontendVps: input.deployFrontendVps,
        backendPath: `/opt/strapi-sites/${input.siteName}/repo/Backend`,
        frontendPath: input.deployFrontendVps ? `/opt/strapi-sites/${input.siteName}/repo/Frontend` : null,
        envBackendPath: `/opt/strapi-sites/${input.siteName}/repo/Backend/.env`,
        envFrontendPath: input.deployFrontendVps ? `/opt/strapi-sites/${input.siteName}/repo/Frontend/.env` : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        actorId: input.actorId,
        action: "DEPLOY_FROM_PORTAL",
        output: result.all?.slice(-20000) ?? "Completed",
      },
    });

    return { ok: true, output: result.all ?? "", projectId: project.id };
  } catch (error) {
    return {
      ok: false,
      output: error instanceof Error ? error.message : "Unknown deployment error",
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
