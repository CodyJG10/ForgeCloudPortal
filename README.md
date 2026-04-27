# Forge Cloud Portal

A Next.js management portal for **ForgeTemplate** deployments (Strapi + Astro).

This is an MVP toward a Cloudways-style control plane for your managed hosting stack.

## What it can do now

- User auth with role-based access (`ADMIN`, `OPERATOR`, `VIEWER`)
- Seeded admin account via env vars
- Add/manage multiple VPS servers over SSH
- Link existing ForgeTemplate projects already running on a VPS
- Deploy a new project from ForgeTemplate using Ansible (`deploy.yml`) from the portal
- Per-project operations:
  - Container status
  - Recent logs
  - Restart backend services
  - Rebuild/restart full stack
  - `git pull` + deploy
- Read/edit remote `.env` files for backend and frontend
- Quick links for backend URL, frontend URL, and Adminer
- Activity log history per project

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite
- SSH orchestration with `node-ssh`
- Ansible invocation with `execa`

## Prerequisites

- Node 22+
- `ansible-playbook` available on the host running this portal (for deploy wizard)
- Local clone of ForgeTemplate available at `../ForgeTemplate` or set `FORGE_TEMPLATE_PATH`

## Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Then open http://localhost:3000 and log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Environment variables

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="..."
ENCRYPTION_KEY="..."
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="ChangeMe123!"
ADMIN_NAME="Portal Admin"
FORGE_TEMPLATE_PATH="../ForgeTemplate"
```

## Notes / current limits

- New-project deploy wizard currently supports VPS+Ansible path and expects SSH key auth for the selected VPS record.
- Cloudflare frontend provisioning is not wired yet in the wizard.
- No background queue yet (deploy/ops run in request lifecycle).
- No 2FA / SSO yet.

## Suggested next steps

1. Add queued jobs + websocket/live logs for long deploys.
2. Add full Cloudflare provisioning flow from ForgeTemplate scripts.
3. Add backup snapshots + restore.
4. Add per-project secrets vault + rotation.
5. Add metrics/health dashboards and alerting.
