# Perfil de revisão do filo-back

Use este perfil somente quando o PR alterar o backend.

## Superfícies prioritárias

- NestJS: controller, DTO, guard/decorator, service e serialização da resposta.
- Prisma/PostgreSQL: query, transação, constraint, migration, precisão e concorrência.
- JWT/sessão: autenticação, papéis, revogação e autorização por recurso.
- Integrações e jobs: isolamento por fábrica, idempotência, falha parcial e observabilidade.
- Contrato público: endpoint, payload, status, erro, enum e compatibilidade com o frontend publicado.

## Checks

Comece pelo escopo específico. Use somente comandos não destrutivos previstos no `AGENTS.md`. Em review, não use `pnpm run lint` se ele aplicar `--fix`; prefira `pnpm exec eslint` nos arquivos afetados ou no projeto. `prisma validate` não prova que uma migration é segura, e nenhum check autoriza aplicar migration, seed ou reset.

## Evidência mínima

Para segurança, siga ator, fábrica e recurso até o ponto efetivo de autorização e inclua cenário negativo A→B. Para mutação composta, demonstre atomicidade, retry e falha intermediária. Para contrato, consulte o consumidor no `filo-front` quando disponível.
