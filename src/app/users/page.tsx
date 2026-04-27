import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button, Card, Input, Pill } from "@/components/ui";
import { createUserAction, deleteUserAction } from "./actions";

export default async function UsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-xl font-semibold">User Management</h1>
        <p className="mt-1 text-sm text-zinc-400">Seeded admin plus team operators/viewers.</p>

        <form action={createUserAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <Input name="email" type="email" placeholder="name@company.com" required />
          <Input name="name" placeholder="Display name" />
          <Input name="password" type="password" placeholder="Temporary password" required />
          <select name="role" defaultValue="OPERATOR" className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            <option value="ADMIN">ADMIN</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="VIEWER">VIEWER</option>
          </select>

          <div className="md:col-span-2">
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Users</h2>
        <div className="mt-3 space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3 text-sm">
              <div>
                <p className="font-medium">{user.name ?? user.email}</p>
                <p className="text-zinc-500">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Pill>{user.role}</Pill>
                <form action={deleteUserAction}>
                  <input type="hidden" name="id" value={user.id} />
                  <button type="submit" className="rounded bg-red-700 px-2 py-1 text-xs hover:bg-red-600">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
