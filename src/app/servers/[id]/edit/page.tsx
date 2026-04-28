import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { EditServerForm } from "@/components/edit-server-form";

export default async function EditServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const server = await prisma.vpsServer.findUnique({ where: { id } });
  if (!server) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <h1 className="text-xl font-semibold mb-1">Edit Server</h1>
        <p className="text-sm text-zinc-400 mb-5">
          {server.username}@{server.host}:{server.port}
        </p>
        <EditServerForm
          server={{
            id: server.id,
            name: server.name,
            host: server.host,
            port: server.port,
            username: server.username,
            authType: server.authType,
            defaultProjectDir: server.defaultProjectDir,
            notes: server.notes,
          }}
        />
      </Card>
    </div>
  );
}
