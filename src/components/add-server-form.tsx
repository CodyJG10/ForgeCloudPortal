"use client";

import { useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { createServerAction } from "@/app/servers/actions";

export function AddServerForm() {
  const [authType, setAuthType] = useState<"SSH_KEY" | "PASSWORD">("SSH_KEY");

  return (
    <form action={createServerAction} className="mt-5 grid gap-3 md:grid-cols-2">
      <Input name="name" placeholder="Production VPS 1" required />
      <Input name="host" placeholder="165.245.134.50" required />
      <Input name="port" type="number" defaultValue={22} required />
      <Input name="username" defaultValue="root" required />

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

      <Input name="defaultProjectDir" defaultValue="/opt/strapi-sites" />

      {authType === "SSH_KEY" ? (
        <>
          <Textarea
            name="privateKey"
            rows={5}
            placeholder="-----BEGIN OPENSSH PRIVATE KEY----- ..."
            className="md:col-span-2"
          />
          <Input name="passphrase" placeholder="Private key passphrase (optional)" />
          {/* ensure password is empty when not used */}
          <input type="hidden" name="password" value="" />
        </>
      ) : (
        <>
          <Input
            name="password"
            type="password"
            placeholder="SSH password"
            className="md:col-span-2"
            required
          />
          {/* ensure key fields are empty when not used */}
          <input type="hidden" name="privateKey" value="" />
          <input type="hidden" name="passphrase" value="" />
        </>
      )}

      <Textarea name="notes" rows={2} placeholder="Notes" className="md:col-span-2" />

      <div className="md:col-span-2">
        <Button type="submit">Save Server</Button>
      </div>
    </form>
  );
}
