# =============================================================================
# Dockerfile — Desenvolvimento (NestJS + Prisma + pnpm)
# =============================================================================
FROM node:22-alpine

# libc6-compat → binários nativos compilados para glibc rodarem no musl (Alpine)
# openssl      → obrigatório para o Prisma gerar e executar o client
RUN apk add --no-cache libc6-compat openssl

# Ativa o pnpm via corepack (sem precisar instalar globalmente)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# ── 1. Dependências ───────────────────────────────────────────────────────────
# Copia SOMENTE os manifests primeiro.
# Enquanto package.json e pnpm-lock.yaml não mudarem, esta camada fica em cache
# e o pnpm install não re-executa a cada build — economiza minutos.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── 2. Prisma Client ──────────────────────────────────────────────────────────
# Gera o client a partir do schema.
# Camada separada: só invalida quando prisma/schema.prisma mudar.
COPY prisma ./prisma/
RUN pnpm exec prisma generate

# ── 3. Entrypoint ─────────────────────────────────────────────────────────────
# Copiado antes do COPY . . para camada própria de cache.
COPY docker/entrypoint.dev.sh /entrypoint.dev.sh
RUN chmod +x /entrypoint.dev.sh

# ── 4. Código-fonte ───────────────────────────────────────────────────────────
# Em dev, o volume do compose sobrescreve este COPY com o código do host
# (hot-reload). O COPY aqui garante que a imagem funcione standalone.
COPY . .

EXPOSE 3000

ENTRYPOINT ["/entrypoint.dev.sh"]
CMD ["pnpm", "run", "start:dev"]