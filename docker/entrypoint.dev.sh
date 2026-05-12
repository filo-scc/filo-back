#!/bin/sh
set -e

SEED_FLAG="/data/.seed-ran"

echo "Iniciando ambiente de desenvolvimento Filo..."

# ── Migrações ────────────────────────────────────────────────────────────────
echo "Aplicando migrações pendentes..."
pnpm exec prisma migrate deploy
echo "Migrações aplicadas."

# ── Seed ─────────────────────────────────────────────────────────────────────
if [ "${RUN_SEED}" = "true" ] && [ ! -f "$SEED_FLAG" ]; then
  echo "Rodando seed do banco de dados..."

  pnpm exec prisma db seed

  touch "$SEED_FLAG"

  echo "Seed concluído."
else
  echo "Seed ignorado."
fi

# ── Start ────────────────────────────────────────────────────────────────────
echo "Tudo pronto! Executando: $*"
exec "$@"