#!/bin/sh
set -e

echo "→ Applying database schema..."
node_modules/.bin/prisma db push --skip-generate

echo "→ Seeding admin user (if not exists)..."
node_modules/.bin/tsx prisma/seed.ts || true

echo "→ Starting Next.js..."
exec node server.js
