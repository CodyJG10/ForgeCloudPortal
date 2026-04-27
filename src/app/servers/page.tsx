import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button, Card, Input, Pill, Textarea } from "@/components/ui";
import { createServerAction, deleteServerAction } from "./actions";
import { ServerTestForm } from "@/components/server-test-form";

export default async function ServersPage() {
  const user = await requireUser();
  const servers = await prisma.vpsServer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-xl font-semibold">VPS Servers</h1>
        <p className="mt-1 text-sm text-zinc-400">Add the SSH hosts that run ForgeTemplate projects.</p>

        <form action={createServerAction} className="mt-5 grid gap-3 md:grid-cols-2">
          <Input name="name" placeholder="Production VPS 1" required />
          <Input name="host" placeholder="165.245.134.50" required />
          <Input name="port" type="number" defaultValue={22} required />
          <Input name="username" defaultValue="root" required />

          <div>
            <label className="mb-1 block text-sm text-zinc-300">Auth type</label>
            <select name="authType" defaultValue="SSH_KEY" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
              <option value="SSH_KEY">SSH Key</option>
              <option value="PASSWORD">Password</option>
            </select>
          </div>

          <Input name="defaultProjectDir" defaultValue="/opt/strapi-sites" />

          <Textarea name="privateKey" rows={5} placeholder="-----BEGIN OPENSSH PRIVATE KEY----- ..." className="md:col-span-2" />
          <Input name="passphrase" placeholder="Private key passphrase (optional)" />
          <Input name="password" placeholder="Password auth (optional)" />

          <Textarea name="notes" rows={2} placeholder="Notes" className="md:col-span-2" />

          <div className="md:col-span-2">
            <Button type="submit">Save Server</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {servers.map((server) => (
          <Card key={server.id}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{server.name}</h2>
                <p className="text-sm text-zinc-400">
                  {server.username}@{server.host}:{server.port}
                </p>
              </div>
              <Pill>{server.authType}</Pill>
            </div>

            <p className="mb-3 text-sm text-zinc-300">Projects linked: {server._count.projects}</p>
            {server.notes ? <p className="mb-4 text-sm text-zinc-400">{server.notes}</p> : null}

            <div className="space-y-2">
              <ServerTestForm id={server.id} />
              {user.role === "ADMIN" ? (
                <form action={deleteServerAction}>
                  <input type="hidden" name="id" value={server.id} />
                  <Button type="submit" className="w-full bg-red-700 hover:bg-red-600">
                    Delete Server
                  </Button>
                </form>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
