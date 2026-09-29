---
name: prisma-migration-review
description: Revisar mudanças de Prisma schema e migrations PostgreSQL do FILO quanto a dados existentes, locks, compatibilidade, backfill, rollback e ordem de deploy. Use quando prisma/schema.prisma, prisma/migrations ou tipos persistidos mudarem; não aplique migrations nem use para query comum sem evolução de schema.
---

# Prisma Migration Review

Produza uma análise verificável da evolução do banco sem executar mudanças em ambiente compartilhado.

Use os parâmetros, permissões e o contrato de saída de [manifest.yaml](manifest.yaml). A skill é ativa e informativa; não aplica migrations.

## Procedimento

1. Aplique `AGENTS.md`, `INV-DATA-001/003/004/006/008`; valide a entrada.
2. Fixe base/head e leia schema, migrations, histórico, queries, DTOs, jobs e consumidores relevantes.
3. Leia [references/protocol.md](references/protocol.md).
4. Compare banco antes/depois, dados já existentes e as quatro combinações de código antigo/novo com schema antigo/novo quando aplicável.
5. Analise lock, duração, backfill, idempotência, verificação, rollback e falha parcial.

## Limites

- Nunca execute `migrate deploy`, `migrate reset`, `db push`, seed ou SQL de escrita em banco compartilhado.
- `prisma validate` e `prisma generate` são checks locais permitidos quando disponíveis; eles não provam segurança operacional da migration.
- Não reescreva migration já aplicada. Uma correção deve entrar em nova migration ou plano aprovado.
- Sem volume, versão do PostgreSQL ou estado de deploy, declare as estimativas como limitações.

## Entrega

Siga as seções do manifest. Se faltar uma migration exigida pela mudança, registre isso como evidência; não gere nem aplique a migration durante a revisão.
