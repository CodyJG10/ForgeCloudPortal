"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea } from "@/components/ui";
import { updateServerAction } from "@/app/servers/actions";

type ServerData = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: string;
  defaultProjectDir: string;
  notes: string | null;
};

export function EditServerForm({ server }: { server: ServerData }) {
  const router = useRouter();
  const [authType, setAuthType] = useState<"SSH_KEY" | "PASSWORD">(
    server.authType === "PASSWORD" ? "PASSWORD" : "SSH_KEY"
  );

  async function handleSubmit(formData: FormData) {
    await updateServerAction(formData);
    router.push("/servers");
  }

  return (
    <form action={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="id" value={server.id} />

      <div>
        <label className="mb-1 block text-sm text-zinc-300">Name</label>
        <Input name="name" defaultValue={server.name} required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-300">Host</label>
        <Input name="host" defaultValue={server.host} required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-300">Port</label>
        <Input name="port" type="number" defaultValue={server.port} required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-300">Username</label>
        <Input name="username" defaultValue={server.username} required />
      </div>

      <div>
        <label className="mb-1 block text-sm text-zinc-300">Auth type</label>
        <select
          name="authType"
          value={authType}
          onChange={(e) => setAuthType(e.target.value as "SSH_KEY" | "PASSWORD")}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        >
          <option value="SSH_KEY">SSH Key</option>
          <option value="PASSWORD">Password</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-zinc-300">Default project dir</label>
        <Input name="defaultProjectDir" defaultValue={server.defaultProjectDir} />
      </div>

      {authType === "SSH_KEY" ? (
        <>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-zinc-300">
              Private Key <span className="text-zinc-500">(leave blank to keep existing)</span>
            </label>
            <Textarea
              name="privateKey"
              rows={5}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY----- ..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-300">
              Passphrase <span className="text-zinc-500">(leave blank to keep existing)</span>
            </label>
            <Input name="passphrase" type="password" placeholder="Key passphrase (optional)" />
          </div>
          <input type="hidden" name="password" value="" />
        </>
      ) : (
        <>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-zinc-300">
              Password <span className="text-zinc-500">(leave blank to keep existing)</span>
            </label>
            <Input name="password" type="password" placeholder="SSH password" />
          </div>
          <input type="hidden" name="privateKey" value="" />
          <input type="hidden" name="passphrase" value="" />
        </>
      )}

      <div className="md:col-span-2">
        <label className="mb-1 block text-sm text-zinc-300">Notes</label>
        <Textarea name="notes" rows={2} defaultValue={server.notes ?? ""} placeholder="Notes" />
      </div>

      <div className="flex gap-2 md:col-span-2">
        <Button type="submit">Save Changes</Button>
        <button
          type="button"
          onClick={() => router.push("/servers")}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
