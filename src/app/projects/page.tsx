import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button, Card, Input } from "@/components/ui";
import { linkProjectAction, removeProjectAction } from "./actions";
import { DeleteButton } from "@/components/delete-button";

export default async function ProjectsPage() {
  const user = await requireUser();
  const [projects, servers] = await Promise.all([
    prisma.project.findMany({ include: { server: true }, orderBy: { createdAt: "desc" } }),
    prisma.vpsServer.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h1 className="text-xl font-semibold">Link Existing Project</h1>
          <p className="mt-1 text-sm text-zinc-400">Connect projects already deployed on a VPS.</p>

          <form action={linkProjectAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-zinc-300">Server</label>
              <select name="serverId" required className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
                <option value="">Select server...</option>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name} ({server.host})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-300">Project Name</label>
              <Input name="name" placeholder="My Client Project" required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-300">Site Slug</label>
              <Input name="siteName" placeholder="my-client-site" required />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-zinc-300">Repository URL</label>
              <Input name="repoUrl" placeholder="https://github.com/org/repo.git" required />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-300">Branch</label>
              <Input name="branch" defaultValue="main" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-300">Backend Domain</label>
              <Input name="domain" placeholder="api.example.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-300">Frontend Domain (optional)</label>
              <Input name="frontendDomain" placeholder="www.example.com" />
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-300 md:col-span-2">
              <input type="checkbox" name="deployFrontendVps" /> Frontend runs on this VPS (docker compose profile full)
            </label>

            <div className="md:col-span-2">
              <Button type="submit">Link Project</Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Create New from Template</h2>
          <p className="mt-1 text-sm text-zinc-400">Generate and deploy a new ForgeTemplate project from the portal.</p>
          <Link href="/projects/new" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">
            Open Deployment Wizard
          </Link>
          <p className="mt-4 text-xs text-zinc-500">Note: this MVP currently supports VPS+Ansible deployment path (SSH key auth required).</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold">Managed Projects</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="pb-2">Project</th>
                <th className="pb-2">Server</th>
                <th className="pb-2">Domains</th>
                <th className="pb-2">Ports</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-t border-zinc-800">
                  <td className="py-3">
                    <p className="font-medium">{project.name}</p>
                    <p className="text-xs text-zinc-500">{project.siteName}</p>
                  </td>
                  <td className="py-3 text-zinc-300">{project.server.name}</td>
                  <td className="py-3">
                    <p>{project.domain ?? "-"}</p>
                    <p className="text-xs text-zinc-500">{project.frontendDomain ?? ""}</p>
                  </td>
                  <td className="py-3 text-zinc-300">
                    {project.strapiPort ?? "-"} / {project.adminerPort ?? "-"} / {project.frontendPort ?? "-"}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/projects/${project.id}`} className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700">
                        Open
                      </Link>
                      {user.role === "ADMIN" ? (
                        <DeleteButton
                          action={removeProjectAction}
                          idName="projectId"
                          idValue={project.id}
                          label="Remove"
                          className="rounded bg-red-700 px-2 py-1 text-xs hover:bg-red-600"
                          confirmMessage={`Remove project "${project.name}"? This cannot be undone.`}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
