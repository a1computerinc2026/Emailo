#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
cd /app
pnpm db:migrate || echo "[entrypoint] migrate failed or no migrations; continuing"

echo "[entrypoint] Starting: $@"
exec "$@"