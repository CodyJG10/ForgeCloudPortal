# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma client for linux/amd64 (the runtime platform)
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-slim AS runner

# Install Ansible, openssh-client, and python3 (required by Ansible)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ansible \
      openssh-client \
      python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Default DB path — override with DATABASE_URL env var or mount a volume at /app/data
ENV DATABASE_URL=file:/app/data/prod.db

# Copy build output and runtime dependencies
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copy full node_modules so prisma CLI and tsx are available for the entrypoint
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# SQLite database lives in /app/data — mount a volume there
RUN mkdir -p /app/data

# Entrypoint: apply any pending schema changes, then start the app
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
