---
name: prisma-migration-review
description: Revisar mudanças de Prisma schema e migrations PostgreSQL do FILO quanto a dados existentes, locks, compatibilidade, backfill, rollback e ordem de deploy. Use quando prisma/schema.prisma, prisma/migrations ou tipos persistidos mudarem; não aplique migrations nem use para query comum sem evolução de schema.
---

# Prisma Migration Review

Produza uma análise verificável da evolução do banco sem executar mudanças em ambiente compartilhado.

## Governança

- Estado: `Proposta`, candidata a piloto supervisionado.
- Owner: Gheyson.
- Substitutos: Arthur Capistrano para backend e Lucas de Holanda para qualidade/segurança.
- Escopo: `filo-back`, PostgreSQL, Prisma e consumidores afetados.
- Evals: `.agents/evals/prisma-migration-review/cases.json`.
- Revisar até 2026-11-30 ou após mudança de versão do Prisma/PostgreSQL.

## Procedimento

1. Aplique `AGENTS.md`, `INV-DATA-001/003/004/006/008` e invariantes do domínio afetado.
2. Fixe base/head e leia schema, migrations novas, histórico relevante, queries, DTOs, jobs e consumidores.
3. Leia [references/protocol.md](references/protocol.md).
4. Compare banco antes/depois, dados já existentes e as quatro combinações de código antigo/novo com schema antigo/novo quando aplicável.
5. Analise lock, duração, backfill, idempotência, verificação, rollback e falha parcial.

## Limites

- Nunca execute `migrate deploy`, `migrate reset`, `db push`, seed ou SQL de escrita em banco compartilhado.
- `prisma validate` e `prisma generate` são checks locais permitidos quando disponíveis; eles não provam segurança operacional da migration.
- Não reescreva migration já aplicada. Uma correção deve entrar em nova migration ou plano aprovado.
- Sem volume, versão do PostgreSQL ou estado de deploy, declare as estimativas como limitações.

## Entrega

Inclua inventário do diff, classificação expand/backfill/contract, compatibilidade, locks, plano de verificação e rollback, ordem de deploy, findings completos e checks. Se não houver arquivo de migration para uma mudança que o exige, isso é evidência; não gere nem aplique a migration em uma revisão.
