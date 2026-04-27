import Link from "next/link";
import type { User } from "@prisma/client";
import { logoutAction } from "@/app/actions";

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-300">Forge Cloud</p>
            <h1 className="text-sm font-semibold">Managed Hosting Portal</h1>
          </div>

          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="rounded px-2 py-1 hover:bg-zinc-800">Dashboard</Link>
            <Link href="/servers" className="rounded px-2 py-1 hover:bg-zinc-800">Servers</Link>
            <Link href="/projects" className="rounded px-2 py-1 hover:bg-zinc-800">Projects</Link>
            {user.role === "ADMIN" ? <Link href="/users" className="rounded px-2 py-1 hover:bg-zinc-800">Users</Link> : null}
            <form action={logoutAction}>
              <button type="submit" className="rounded bg-zinc-800 px-2 py-1 hover:bg-zinc-700">Logout</button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4">{children}</main>
    </div>
  );
}
