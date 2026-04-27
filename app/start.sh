#!/bin/sh
set -e

echo "==> Running database migrations..."
node /app/scripts/migrate.mjs || echo "⚠  Migrations skipped (DB unreachable or not configured) — app starting without analytics."

echo "==> Starting Next.js..."
exec node /app/server.js
