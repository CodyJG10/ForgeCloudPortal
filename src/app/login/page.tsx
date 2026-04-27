import { redirect } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { loginAction } from "./actions";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <Card className="w-full space-y-5">
        <div>
          <p className="text-sm text-zinc-400">Forge Cloud Portal</p>
          <h1 className="text-2xl font-semibold">Sign in</h1>
        </div>

        <form action={loginAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Email</label>
            <Input name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Password</label>
            <Input name="password" type="password" autoComplete="current-password" required />
          </div>

          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </Card>
    </main>
  );
}
