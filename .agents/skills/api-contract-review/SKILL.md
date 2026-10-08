---
name: api-contract-review
description: Comparar contratos de API entre filo-back e filo-front, incluindo DTOs, payloads, tipos, nulabilidade, erros e ordem de deploy. Use quando endpoint, schema de resposta, service frontend ou fluxo compartilhado mudar; não use para lógica interna sem consumidor ou contrato externo.
---

# API Contract Review

Determine se produtor e consumidores conseguem conviver durante o deploy e se representam o mesmo contrato observável.

Use os parâmetros, permissões e o contrato de saída de [manifest.yaml](manifest.yaml). Esta skill é ativa e informativa: encontra riscos, mas não decide merge nem autoriza mudanças.

## Procedimento

1. Aplique o `AGENTS.md`, `INV-API-*`, `INV-DATA-004/005` e as invariantes do fluxo.
2. Valide a entrada conforme o manifest e fixe versões/base/head dos repositórios disponíveis.
3. Leia [references/protocol.md](references/protocol.md) e monte a matriz produtor × consumidor.
4. Compare request, response, erros e comportamento transitório durante a ordem real de deploy.
5. Conteste cada diferença: nem toda adição é incompatível, e nem todo build verde prova compatibilidade.

## Limites

- Em review, não altere código nem publique comentário sem autorização.
- Não trate coerção acidental do frontend como contrato oficial.
- Não exponha dado real de cliente em fixture ou relatório.
- Mudança coordenada em dois PRs ainda precisa funcionar durante a janela entre deploys.

## Entrega

Siga as seções de saída do manifest. Se faltar produtor, consumidor ou especificação necessária, declare o contrato como não comprovado e indique o artefato necessário.
