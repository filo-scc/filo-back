#!/bin/sh
# =============================================================================
# docker/entrypoint.dev.sh
# Executado toda vez que o container api sobe. Responsabilidades:
#   1. Aplica migrações pendentes (migrate deploy — seguro, não-interativo)
#   2. Roda o seed se RUN_SEED=true
#   3. Passa o controle para o CMD (pnpm run start:dev)
# =============================================================================
set -e

echo "Iniciando ambiente de desenvolvimento Filo..."

# ── Migrações ──────────────────────────────────────────────────────────────────
echo "Aplicando migrações pendentes..."
pnpm exec prisma migrate deploy
echo "Migrações aplicadas."

# ── Seed (opcional) ───────────────────────────────────────────────────────────
# Controlado pela variável RUN_SEED no .env ou no comando:
#   RUN_SEED=true docker compose up
if [ "${RUN_SEED}" = "true" ]; then
  echo "Rodando seed do banco de dados..."
  pnpm exec prisma db seed
  echo "Seed concluído."
fi

# ── Start ──────────────────────────────────────────────────────────────────────
echo "Tudo pronto! Executando: $*"
exec "$@"