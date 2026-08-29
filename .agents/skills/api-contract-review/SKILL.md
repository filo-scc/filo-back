---
name: api-contract-review
description: Comparar contratos de API entre filo-back e filo-front, incluindo DTOs, payloads, tipos, nulabilidade, erros e ordem de deploy. Use quando endpoint, schema de resposta, service frontend ou fluxo compartilhado mudar; não use para lógica interna sem consumidor ou contrato externo.
---

# API Contract Review

Determine se produtor e consumidores conseguem conviver durante o deploy e se representam o mesmo contrato observável.

## Governança

- Estado: `Proposta`, candidata a piloto supervisionado.
- Owner: Gheyson.
- Substituto técnico: Arthur Capistrano.
- Evals: `.agents/evals/api-contract-review/cases.json`.
- Revisar até 2026-11-30 ou após mudança do versionamento/deploy da API.

## Procedimento

1. Aplique o `AGENTS.md`, `INV-API-*`, `INV-DATA-004/005` e invariantes do fluxo afetado.
2. Fixe versões/base/head dos dois repositórios disponíveis. Não invente o lado ausente.
3. Leia [references/protocol.md](references/protocol.md) e monte a tabela produtor × consumidor.
4. Compare request, response, erros e comportamento transitório durante a ordem real de deploy.
5. Conteste cada diferença: nem toda adição é incompatível, e nem todo build verde prova compatibilidade.

## Limites

- Em review, não altere código nem publique comentário sem autorização.
- Não trate coerção acidental do frontend como contrato oficial.
- Não exponha dado real de cliente em fixture ou relatório.
- Mudança coordenada em dois PRs ainda precisa funcionar durante a janela entre deploys.

## Entrega e falha segura

Inclua matriz de campos/erros, consumidores encontrados, cenários de convivência, ordem mínima de deploy, findings completos, descartes e limitações. Se um repositório ou especificação necessária não estiver disponível, declare o contrato como não comprovado e indique exatamente o artefato necessário.
