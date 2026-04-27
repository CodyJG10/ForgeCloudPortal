import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { DeployForm } from "@/components/deploy-form";

export default async function NewProjectPage() {
  await requireUser();
  const servers = await prisma.vpsServer.findMany({
    select: { id: true, name: true, host: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <Link href="/projects" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to projects
      </Link>
      <Card>
        <h1 className="text-xl font-semibold">Deploy New ForgeTemplate Project</h1>
        <p className="mt-1 text-sm text-zinc-400">
          This wizard runs the ForgeTemplate Ansible deploy flow with generated secrets and then auto-links the project.
        </p>
        <DeployForm servers={servers} />
      </Card>
    </div>
  );
}
