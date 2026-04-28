import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Pill } from "@/components/ui";
import { deleteServerAction } from "./actions";
import { ServerTestForm } from "@/components/server-test-form";
import { AddServerForm } from "@/components/add-server-form";
import { DeleteButton } from "@/components/delete-button";
import Link from "next/link";

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

        <AddServerForm />
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
              <Link
                href={`/servers/${server.id}/edit`}
                className="block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
              >
                Edit Server
              </Link>
              {user.role === "ADMIN" ? (
                <DeleteButton
                  action={deleteServerAction}
                  idName="id"
                  idValue={server.id}
                  label="Delete Server"
                  confirmMessage={`Delete server "${server.name}"? This cannot be undone.`}
                />
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
