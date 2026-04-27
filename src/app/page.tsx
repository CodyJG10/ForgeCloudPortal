import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Pill } from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();

  const [serverCount, projectCount, recentProjects] = await Promise.all([
    prisma.vpsServer.count(),
    prisma.project.count(),
    prisma.project.findMany({
      include: { server: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-sm text-zinc-400">Welcome back</p>
        <h1 className="text-2xl font-semibold">{user.name ?? user.email}</h1>
        <p className="mt-1 text-sm text-zinc-400">Cloudways-style control panel for ForgeTemplate stacks.</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-zinc-400">VPS Hosts</p>
          <p className="mt-2 text-3xl font-bold">{serverCount}</p>
          <Link href="/servers" className="mt-3 inline-block text-sm text-blue-300 hover:text-blue-200">Manage servers →</Link>
        </Card>

        <Card>
          <p className="text-sm text-zinc-400">Managed Projects</p>
          <p className="mt-2 text-3xl font-bold">{projectCount}</p>
          <Link href="/projects" className="mt-3 inline-block text-sm text-blue-300 hover:text-blue-200">Open project list →</Link>
        </Card>

        <Card>
          <p className="text-sm text-zinc-400">Role</p>
          <p className="mt-2 text-3xl font-bold">{user.role}</p>
          {user.role === "ADMIN" ? <Link href="/users" className="mt-3 inline-block text-sm text-blue-300 hover:text-blue-200">Manage users →</Link> : null}
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Recent Projects</h2>
        <div className="mt-4 space-y-2">
          {recentProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3 hover:border-zinc-700">
              <div>
                <p className="font-medium">{project.name}</p>
                <p className="text-xs text-zinc-500">{project.server.name} · {project.siteName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Pill>{project.branch}</Pill>
                <Pill tone={project.deployFrontendVps ? "ok" : "default"}>{project.deployFrontendVps ? "Full" : "API"}</Pill>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
