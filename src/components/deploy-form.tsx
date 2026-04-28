"use client";

import { useEffect, useState } from "react";
import { deployFromTemplateAction } from "@/app/projects/actions";
import { Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type ServerOption = { id: string; name: string; host: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-zinc-300">{label}</label>
      {children}
    </div>
  );
}

/** "My Client Project" → "my-client-project" */
function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generatePassword(length = 20) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

export function DeployForm({ servers }: { servers: ServerOption[] }) {
  const [projectName, setProjectName] = useState("");
  const [repoName, setRepoName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbUsername, setDbUsername] = useState("");
  const [dbPassword, setDbPassword] = useState("");

  // Generate password on mount
  useEffect(() => {
    setDbPassword(generatePassword());
  }, []);

  function handleProjectNameChange(value: string) {
    setProjectName(value);
    const slug = toSlug(value);
    setRepoName(slug);
    setSiteName(slug);
    setDbName(`${slug.replace(/-/g, "_")}_db`);
    setDbUsername(`${slug.replace(/-/g, "_")}_user`);
  }

  return (
    <form action={deployFromTemplateAction} className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm text-zinc-300">Server</label>
        <select name="serverId" required className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
          <option value="">Select server...</option>
          {servers.map((server) => (
            <option value={server.id} key={server.id}>
              {server.name} ({server.host})
            </option>
          ))}
        </select>
      </div>

      <Field label="Project Name">
        <Input
          name="projectName"
          placeholder="My Client Project"
          required
          value={projectName}
          onChange={(e) => handleProjectNameChange(e.target.value)}
        />
      </Field>
      <Field label="GitHub Repo Name">
        <Input
          name="repoName"
          placeholder="my-client-project"
          required
          value={repoName}
          onChange={(e) => setRepoName(e.target.value)}
        />
      </Field>
      <Field label="Site Slug">
        <Input
          name="siteName"
          placeholder="my-client-project"
          required
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
        />
      </Field>

      <Field label="Branch">
        <Input name="branch" defaultValue="main" />
      </Field>
      <Field label="SSL / Let's Encrypt Email">
        <Input name="sslEmail" placeholder="ops@youragency.com" required />
      </Field>

      <Field label="Backend Domain">
        <Input name="domain" placeholder="api.example.com" required />
      </Field>
      <Field label="Frontend Domain (optional)">
        <Input name="frontendDomain" placeholder="www.example.com" />
      </Field>

      <Field label="Database Name">
        <Input
          name="dbName"
          placeholder="project_db"
          required
          value={dbName}
          onChange={(e) => setDbName(e.target.value)}
        />
      </Field>
      <Field label="Database Username">
        <Input
          name="dbUsername"
          placeholder="project_user"
          required
          value={dbUsername}
          onChange={(e) => setDbUsername(e.target.value)}
        />
      </Field>

      <div className="md:col-span-2">
        <Field label="Database Password">
          <div className="flex gap-2">
            <Input
              name="dbPassword"
              required
              value={dbPassword}
              onChange={(e) => setDbPassword(e.target.value)}
              className="font-mono"
            />
            <button
              type="button"
              onClick={() => setDbPassword(generatePassword())}
              className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700"
              title="Generate new password"
            >
              ↻ New
            </button>
          </div>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-300 md:col-span-2">
        <input type="checkbox" name="deployFrontendVps" /> Deploy frontend on the same VPS (docker compose profile full)
      </label>

      <div className="md:col-span-2">
        <SubmitButton
          idleText="Deploy with ForgeTemplate"
          pendingText="Deploying… this can take a while"
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
        />
      </div>
    </form>
  );
}
