import { deployFromTemplateAction } from "@/app/projects/actions";
import { Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type ServerOption = { id: string; name: string; host: string };

export function DeployForm({ servers }: { servers: ServerOption[] }) {
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

      <Input name="projectName" placeholder="Client Project Name" required />
      <Input name="siteName" placeholder="client-site-slug" required />
      <Input name="repoUrl" defaultValue="https://github.com/CodyJG10/ForgeTemplate.git" required className="md:col-span-2" />
      <Input name="branch" defaultValue="main" />
      <Input name="sslEmail" placeholder="ops@youragency.com" required />
      <Input name="domain" placeholder="api.clientdomain.com" required />
      <Input name="frontendDomain" placeholder="clientdomain.com (optional for VPS frontend)" />
      <Input name="dbName" placeholder="strapi_db" required />
      <Input name="dbUsername" placeholder="strapi_user" required />
      <Input name="dbPassword" placeholder="Strong DB password" required type="password" />

      <label className="flex items-center gap-2 text-sm text-zinc-300 md:col-span-2">
        <input type="checkbox" name="deployFrontendVps" /> Deploy Astro frontend on same VPS (profile full)
      </label>

      <div className="md:col-span-2">
        <SubmitButton
          idleText="Deploy with ForgeTemplate"
          pendingText="Deploying... this can take a while"
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
        />
      </div>
    </form>
  );
}
