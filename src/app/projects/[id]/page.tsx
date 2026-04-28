import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runCommand } from "@/lib/ssh";
import { decryptSecret } from "@/lib/crypto";
import { Card, Pill } from "@/components/ui";
import { ProjectOperationForm } from "@/components/project-operation-form";
import { EnvEditor } from "@/components/env-editor";

async function readRemoteFile(projectId: string, commandResult: Promise<{ ok: boolean; stdout: string; stderr: string }>) {
  try {
    const result = await commandResult;
    if (!result.ok) return `# Could not load file\n# ${result.stderr}`;
    return result.stdout || "# File is currently empty";
  } catch (error) {
    await prisma.activityLog
      .create({
        data: {
          projectId,
          action: "ENV_READ_FAILED",
          output: error instanceof Error ? error.message : "Unknown read error",
        },
      })
      .catch(() => undefined);
    return "# Could not load env from server";
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      server: true,
      activityLogs: { orderBy: { createdAt: "desc" }, take: 12 },
    },
  });

  if (!project) notFound();

  const [backendEnv, frontendEnv] = await Promise.all([
    project.envBackendPath
      ? readRemoteFile(project.id, runCommand(project.server, `cat '${project.envBackendPath}'`))
      : Promise.resolve("# backend env path not configured"),
    project.envFrontendPath
      ? readRemoteFile(project.id, runCommand(project.server, `cat '${project.envFrontendPath}'`))
      : Promise.resolve("# frontend env path not configured"),
  ]);

  const backendUrl = project.domain ? `https://${project.domain}` : null;
  const frontendUrl = project.frontendDomain ? `https://${project.frontendDomain}` : null;
  const adminerUrl = project.adminerPort ? `http://${project.server.host}:${project.adminerPort}` : null;
  const dbPassword = decryptSecret(project.dbPasswordEnc);

  return (
    <div className="space-y-6">
      <Link href="/projects" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to projects
      </Link>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="text-sm text-zinc-400">{project.siteName} • {project.server.name}</p>
          </div>
          <div className="flex gap-2">
            <Pill>{project.branch}</Pill>
            <Pill tone={project.deployFrontendVps ? "ok" : "default"}>{project.deployFrontendVps ? "VPS Frontend" : "Backend Only / Cloudflare"}</Pill>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <a className="rounded-lg border border-zinc-800 p-3 hover:border-zinc-700" href={backendUrl ?? "#"} target="_blank">
            Backend API\n{backendUrl ?? "Not configured"}
          </a>
          <a className="rounded-lg border border-zinc-800 p-3 hover:border-zinc-700" href={frontendUrl ?? "#"} target="_blank">
            Frontend\n{frontendUrl ?? "Not configured"}
          </a>
          <a className="rounded-lg border border-zinc-800 p-3 hover:border-zinc-700" href={adminerUrl ?? "#"} target="_blank">
            Adminer\n{adminerUrl ?? "Not configured"}
          </a>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Operations</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <ProjectOperationForm projectId={project.id} operation="status" label="Check Container Status" />
          <ProjectOperationForm projectId={project.id} operation="logs" label="Fetch Recent Logs" />
          <ProjectOperationForm projectId={project.id} operation="restart_backend" label="Restart Backend Services" />
          <ProjectOperationForm projectId={project.id} operation="restart_all" label="Rebuild + Restart Stack" />
          <ProjectOperationForm projectId={project.id} operation="git_pull_deploy" label="Git Pull + Deploy" />
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Database Credentials</h2>
        <p className="mt-1 text-xs text-zinc-500">PostgreSQL — connect via Adminer or any Postgres client from within the VPS network.</p>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Host</p>
            <code className="block rounded bg-zinc-900 px-3 py-2 font-mono text-zinc-200">strapiDB</code>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Port</p>
            <code className="block rounded bg-zinc-900 px-3 py-2 font-mono text-zinc-200">5432</code>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Database</p>
            <code className="block rounded bg-zinc-900 px-3 py-2 font-mono text-zinc-200">{project.dbName ?? "—"}</code>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Username</p>
            <code className="block rounded bg-zinc-900 px-3 py-2 font-mono text-zinc-200">{project.dbUsername ?? "—"}</code>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-zinc-500 mb-1">Password</p>
            <code className="block rounded bg-zinc-900 px-3 py-2 font-mono text-zinc-200">{dbPassword ?? "—"}</code>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Backend .env</h2>          <p className="mt-1 text-xs text-zinc-500">{project.envBackendPath}</p>
          <div className="mt-3">
            <EnvEditor projectId={project.id} which="backend" initialContent={backendEnv} />
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Frontend .env</h2>
          <p className="mt-1 text-xs text-zinc-500">{project.envFrontendPath ?? "Not configured"}</p>
          <div className="mt-3">
            <EnvEditor projectId={project.id} which="frontend" initialContent={frontendEnv} />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold">Recent Activity</h2>
        <div className="mt-4 space-y-3">
          {project.activityLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-zinc-800 p-3">
              <p className="text-sm font-medium">{log.action}</p>
              <p className="text-xs text-zinc-500">{log.createdAt.toLocaleString()}</p>
              {log.output ? <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-zinc-300">{log.output.slice(-1200)}</pre> : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
