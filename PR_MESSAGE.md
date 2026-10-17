## Descrição

Atualiza o CI do backend para validar pull requests destinados à branch `develop` e corrige os erros de tipagem das specs cobertas pelo DEV-498.

## Ticket Jira

- DEV-397
- DEV-498

## Tipo de alteração

- [ ] Correção de bug (alteração não destrutiva que resolve um problema)
- [x] Nova funcionalidade (alteração não destrutiva que adiciona uma função)
- [ ] Alteração destrutiva (correção ou funcionalidade que impacta o comportamento existente)
- [ ] Esta alteração requer atualização na documentação

## Objetivo

1. Fazer o CI rodar em PRs para `develop`, mantendo `master` como destino de validação.
2. Garantir que PRs para `develop` executem lint, formatação, typecheck, testes e build sem construir ou publicar a imagem de produção, executar migrations de produção ou fazer deploy.
3. Corrigir os erros de `pnpm exec tsc --noEmit -p tsconfig.json` nas specs de aviamento, tecidos, cor, produto-aviamento e concorrência.

## Atividades Realizadas

- [x] Adicionado `develop` ao gatilho `pull_request` do workflow de CI.
- [x] Adicionado o typecheck após a geração do Prisma Client.
- [x] Restrita a validação da imagem de produção a PRs para `master` e `push` em `master`.
- [x] Corrigidos os fixtures e payloads das cinco famílias de specs sem alterar DTOs ou services de produção.
- [x] Ajustada a spec de parceiro para usar os globais e mocks compatíveis com o Jest configurado no projeto.
- [x] Mantidas as condições de publicação, migrations de produção e deploy somente para `push` em `master`.

## Checklist

- [x] Eu rodei `pnpm exec prettier --check .` e meu código segue os padrões de Prettier
- [ ] Eu rodei `pnpm exec eslint .` e meu código segue sem nenhum error ou warning pendentes
- [x] Realizei uma autorrevisão do meu próprio código
- [x] Adicionei ou atualizei testes relacionados às alterações
- [x] Não há `console.log`, comentários temporários ou código morto
- [x] As variáveis de ambiente necessárias estão documentadas

> O `pnpm exec eslint .` completo encontrou 52 erros preexistentes em scripts dentro de `.agents/`, fora do escopo deste PR. O ESLint dos arquivos alterados passou.

## Evidências / Screenshots

Não há alteração visual que exija screenshots.

- Prettier completo: passou.
- ESLint dos arquivos alterados: passou.
- Specs alteradas: 6 suites e 103 testes passaram.
- Suíte completa: 699 testes passaram; uma suite falhou porque `@nestjs/schedule` não está instalado localmente.
- Typecheck: os erros das specs foram resolvidos; a execução local ficou bloqueada pela dependência ausente `@nestjs/schedule`.
- Build: bloqueado por `EACCES` preexistente ao remover `dist/prisma`.

## Resumo do fluxo

```text
pull_request -> master   -> validações + gates de produção existentes
pull_request -> develop  -> lint, formatação, typecheck, testes e build, sem imagem de produção
push -> master            -> validação da imagem, publicação, migrations e deploy
```

## Risco de Merge

**Porta de merge:** reversível (`two-way door`)

O rollback pode ser feito revertendo os commits desta task. O impacto fica restrito ao workflow de CI e à compilação das specs.

**Blast Radius:** CI
