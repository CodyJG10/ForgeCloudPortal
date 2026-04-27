"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { deployForgeProject } from "@/lib/forge-deploy";
import { prisma } from "@/lib/prisma";
import { runCommand } from "@/lib/ssh";

const linkProjectSchema = z.object({
  serverId: z.string().min(1),
  name: z.string().min(2),
  siteName: z.string().min(2),
  repoUrl: z.string().min(4),
  branch: z.string().default("main"),
  domain: z.string().optional(),
  frontendDomain: z.string().optional(),
  backendPath: z.string().min(1),
  frontendPath: z.string().optional(),
  envBackendPath: z.string().optional(),
  envFrontendPath: z.string().optional(),
  strapiPort: z.coerce.number().int().optional(),
  adminerPort: z.coerce.number().int().optional(),
  frontendPort: z.coerce.number().int().optional(),
  deployFrontendVps: z.boolean().optional(),
});

export async function linkProjectAction(formData: FormData) {
  await requireUser();
  const parsed = linkProjectSchema.safeParse({
    serverId: formData.get("serverId"),
    name: formData.get("name"),
    siteName: formData.get("siteName"),
    repoUrl: formData.get("repoUrl"),
    branch: formData.get("branch"),
    domain: formData.get("domain"),
    frontendDomain: formData.get("frontendDomain"),
    backendPath: formData.get("backendPath"),
    frontendPath: formData.get("frontendPath"),
    envBackendPath: formData.get("envBackendPath"),
    envFrontendPath: formData.get("envFrontendPath"),
    strapiPort: formData.get("strapiPort"),
    adminerPort: formData.get("adminerPort"),
    frontendPort: formData.get("frontendPort"),
    deployFrontendVps: formData.get("deployFrontendVps") === "on",
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid form");

  const input = parsed.data;

  await prisma.project.create({
    data: {
      ...input,
      branch: input.branch || "main",
      envBackendPath: input.envBackendPath || `${input.backendPath}/.env`,
      envFrontendPath: input.envFrontendPath || (input.frontendPath ? `${input.frontendPath}/.env` : null),
      frontendPath: input.frontendPath || null,
      strapiPort: input.strapiPort || null,
      adminerPort: input.adminerPort || null,
      frontendPort: input.frontendPort || null,
      domain: input.domain || null,
      frontendDomain: input.frontendDomain || null,
      deployFrontendVps: !!input.deployFrontendVps,
    },
  });

  revalidatePath("/projects");
}

const deploySchema = z.object({
  serverId: z.string().min(1),
  projectName: z.string().min(2),
  siteName: z.string().min(2),
  repoUrl: z.string().min(4),
  branch: z.string().default("main"),
  domain: z.string().min(3),
  frontendDomain: z.string().optional(),
  sslEmail: z.string().email(),
  dbName: z.string().min(1),
  dbUsername: z.string().min(1),
  dbPassword: z.string().min(8),
  deployFrontendVps: z.boolean().optional(),
});

function randomSecret(bytes = 32) {
  return randomBytes(bytes).toString("base64");
}

export async function deployFromTemplateAction(formData: FormData) {
  const user = await requireUser();
  if (user.role === "VIEWER") throw new Error("Viewers cannot deploy.");

  const parsed = deploySchema.safeParse({
    serverId: formData.get("serverId"),
    projectName: formData.get("projectName"),
    siteName: formData.get("siteName"),
    repoUrl: formData.get("repoUrl"),
    branch: formData.get("branch"),
    domain: formData.get("domain"),
    frontendDomain: formData.get("frontendDomain"),
    sslEmail: formData.get("sslEmail"),
    dbName: formData.get("dbName"),
    dbUsername: formData.get("dbUsername"),
    dbPassword: formData.get("dbPassword"),
    deployFrontendVps: formData.get("deployFrontendVps") === "on",
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid deploy payload");

  const input = parsed.data;
  const server = await prisma.vpsServer.findUnique({ where: { id: input.serverId } });
  if (!server) throw new Error("Server not found");

  const privateKey = decryptSecret(server.privateKeyEnc);
  if (!privateKey) throw new Error("This deployment path currently requires SSH key auth on the server.");

  const result = await deployForgeProject({
    projectName: input.projectName,
    siteName: input.siteName,
    repoUrl: input.repoUrl,
    branch: input.branch,
    domain: input.domain,
    frontendDomain: input.frontendDomain,
    sslEmail: input.sslEmail,
    dbName: input.dbName,
    dbUsername: input.dbUsername,
    dbPassword: input.dbPassword,
    strapiAppKeys: `${randomSecret()},${randomSecret()}`,
    strapiAdminJwtSecret: randomSecret(),
    strapiJwtSecret: randomSecret(),
    strapiApiTokenSalt: randomSecret(),
    strapiTransferTokenSalt: randomSecret(),
    strapiEncryptionKey: randomSecret(),
    deployFrontendVps: !!input.deployFrontendVps,
    server: {
      id: server.id,
      host: server.host,
      username: server.username,
      port: server.port,
      privateKey,
    },
    actorId: user.id,
  });

  revalidatePath("/projects");

  if (!result.ok) {
    throw new Error(result.output.slice(-500));
  }
}

export async function projectOperationAction(formData: FormData) {
  const user = await requireUser();
  if (user.role === "VIEWER") throw new Error("Viewers cannot run operations.");

  const projectId = String(formData.get("projectId") ?? "");
  const operation = String(formData.get("operation") ?? "");
  if (!projectId || !operation) throw new Error("Missing operation payload");

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { server: true } });
  if (!project) throw new Error("Project not found");

  let command = "";
  if (operation === "restart_backend") {
    command = "docker compose restart strapi strapiDB strapiAdminer";
  } else if (operation === "restart_all") {
    command = `docker compose ${project.deployFrontendVps ? "--profile full " : ""}up -d --build`;
  } else if (operation === "git_pull_deploy") {
    command = `git pull origin ${project.branch} && docker compose ${project.deployFrontendVps ? "--profile full " : ""}up -d --build`;
  } else if (operation === "status") {
    command = "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'";
  } else if (operation === "logs") {
    command = "docker compose logs --tail=120";
  } else {
    throw new Error("Unsupported operation");
  }

  const result = await runCommand(project.server, command, project.backendPath);

  await prisma.activityLog.create({
    data: {
      projectId: project.id,
      actorId: user.id,
      action: operation,
      output: `${result.stdout}\n${result.stderr}`.trim().slice(-20000),
    },
  });

  revalidatePath(`/projects/${project.id}`);

  if (!result.ok) throw new Error(result.stderr || "Operation failed");
}

export async function updateEnvFileAction(formData: FormData) {
  const user = await requireUser();
  if (user.role === "VIEWER") throw new Error("Viewers cannot edit env files.");

  const projectId = String(formData.get("projectId") ?? "");
  const which = String(formData.get("which") ?? "backend");
  const content = String(formData.get("content") ?? "");

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { server: true } });
  if (!project) throw new Error("Project not found");

  const envPath = which === "frontend" ? project.envFrontendPath : project.envBackendPath;
  if (!envPath) throw new Error("Env path not set for this project");

  const encoded = Buffer.from(content, "utf8").toString("base64");
  const result = await runCommand(project.server, `echo '${encoded}' | base64 -d > '${envPath}'`);

  await prisma.activityLog.create({
    data: {
      projectId: project.id,
      actorId: user.id,
      action: `update_env_${which}`,
      output: result.ok ? "Updated" : result.stderr,
    },
  });

  revalidatePath(`/projects/${project.id}`);
  if (!result.ok) throw new Error(result.stderr || "Could not update env file");
}

export async function removeProjectAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Only admins can delete projects.");

  const projectId = String(formData.get("projectId") ?? "");
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/projects");
}
