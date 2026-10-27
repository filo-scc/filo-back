# Guia rápido das skills FILO

As skills canônicas ficam em `.agents/skills/`. Invoque uma skill pelo nome, informe o alvo e o contexto que já possui. Parâmetros, permissões, entradas válidas e formato da saída estão no `manifest.yaml` de cada skill.

Todas estão em estado `ativa-informativa`: apoiam análise e produção de artefatos, mas não aprovam PR, aceitam risco, fazem merge, deploy, migration ou envio externo.

## Quando usar

| Skill | Use quando | Exemplo curto |
| --- | --- | --- |
| `github-pr-review` | Houver pedido explícito para revisar um PR do `filo-back` ou `filo-front`. | `Use $github-pr-review para revisar o PR 75 do filo-back.` |
| `tenant-isolation-review` | Um fluxo envolver `fabrico_id`, recurso tenant, posse derivada ou possível acesso entre fábricas. | `Use $tenant-isolation-review no PATCH /pedidos/:id e teste fábrica A contra B.` |
| `authorization-review` | Mudar autenticação, papéis, guards, rotas protegidas, capacidades ou revogação de sessão. | `Use $authorization-review para revisar o novo guard de GERENTE.` |
| `data-integrity-review` | Operação composta, batch, cálculo, exclusão, job ou concorrência puder gerar estado parcial ou incorreto. | `Use $data-integrity-review no batch de itens da ficha técnica.` |
| `prisma-migration-review` | Mudar `schema.prisma`, migration ou tipo persistido e for preciso avaliar dados existentes e deploy. | `Use $prisma-migration-review na migration que torna cliente_id obrigatório.` |
| `api-contract-review` | Endpoint, DTO, payload, enum, nulabilidade, erros ou consumidor frontend mudarem. | `Use $api-contract-review no novo campo produzida_em entre back e front.` |
| `kanban-transition-review` | Mudar etapas, transferência, histórico, `produzida_em` ou job de conclusão do Kanban. | `Use $kanban-transition-review na transferência com salto de etapa.` |
| `filo-update-email` | For necessário criar o HTML de anúncio de uma versão com novidades verificadas. | `Use $filo-update-email para o FILO Update 0.8 a partir destas release notes.` |

## Fluxo exemplo: revisão de PR

1. Invoque `github-pr-review` com número ou URL e repositório.
2. A skill fixa base/head, preserva o checkout e faz duas passagens: descoberta e contestação.
3. Acione somente as especializadas exigidas pelo diff. Exemplo: mudança de endpoint tenant pode exigir `tenant-isolation-review` e `api-contract-review`; uma migration pode exigir `prisma-migration-review` e `data-integrity-review`.
4. Consolide findings sem duplicidade, checks, descartes e limitações.
5. Um responsável humano decide correção, risco e merge.

## Fluxo exemplo: mudança de schema e API

1. Use `prisma-migration-review` para avaliar dados existentes, locks, expand/backfill/contract e rollback.
2. Use `data-integrity-review` para transações, constraints, retry, concorrência e precisão.
3. Se o contrato observável mudou, use `api-contract-review` para comparar produtor e consumidores e definir a ordem segura de deploy.
4. A migration e a janela de deploy continuam dependentes de aprovação humana.

## Fluxo exemplo: email de novidades

1. Informe versão, fontes verificáveis, estado de disponibilidade e data quando aplicável.
2. `filo-update-email` separa mudanças para todos, fabricação sob demanda e produção própria.
3. Se uma mudança estiver apenas em PR ou planejamento, o resultado permanece `NÃO ENVIAR`.
4. A skill cria e valida o HTML; um responsável revisa conteúdo, rodapé, destinatários e efetua o envio na plataforma apropriada.

## Escolha rápida

- Cruzamento entre fábricas: `tenant-isolation-review`.
- Papel, ação ou sessão: `authorization-review`.
- Estado parcial ou concorrência: `data-integrity-review`.
- Evolução do banco: `prisma-migration-review`.
- Compatibilidade back/front: `api-contract-review`.
- Máquina de estados do Kanban: `kanban-transition-review`.
- PR completo: `github-pr-review`, combinada somente com as especialistas aplicáveis.
- Comunicação de release: `filo-update-email`.
