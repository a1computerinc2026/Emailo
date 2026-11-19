#!/usr/bin/env bash
# Emailo - WSL / Linux quick start.
# Starts Postgres + Redis via Docker, applies migrations, then launches web+worker.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install it: https://docs.docker.com/engine/install/"
  exit 1
fi

echo "==> Ensuring .env exists"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from example. Edit it and set AUTH_SECRET, ENCRYPTION_KEY, and OAuth keys."
  echo "Generate AUTH_SECRET: openssl rand -base64 32"
  echo "Generate ENCRYPTION_KEY: openssl rand -hex 32"
  exit 1
fi

echo "==> Starting infrastructure (postgres, redis)"
docker compose up -d postgres redis

echo "==> Waiting for postgres to be healthy"
until docker compose exec -T postgres pg_isready -U emailo >/dev/null 2>&1; do
  sleep 1
done

echo "==> Installing dependencies"
pnpm install

echo "==> Generating Prisma client and applying migrations"
pnpm db:generate
pnpm db:migrate

echo "==> Seeding demo data (optional)"
pnpm db:seed || echo "Seed skipped"

echo ""
echo "Emailo is starting. Web: http://localhost:3000"
echo "Run the background worker in a separate terminal: pnpm worker"