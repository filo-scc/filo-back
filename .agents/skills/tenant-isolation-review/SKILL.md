---
name: tenant-isolation-review
description: Auditar isolamento entre fábricas no backend, contratos do frontend, jobs, caches e relações derivadas do FILO. Use quando uma mudança ou investigação envolver fabrico_id, recursos tenant, IDs recebidos do cliente ou possível acesso cruzado; não use para revisão genérica sem superfície multi-tenant.
---

# Tenant Isolation Review

Encontre caminhos concretos de leitura, mutação ou associação entre fábricas e produza evidências acionáveis sem ampliar o escopo para uma auditoria genérica.

## Governança

- Estado: `Proposta`, candidata a piloto supervisionado.
- Owner: Gheyson.
- Revisão independente para risco crítico/alto: qualidade e segurança, com Lucas de Holanda como substituto.
- Evals: `.agents/evals/tenant-isolation-review/cases.json`.
- Revisar até 2026-11-30 ou após mudança do modelo de identidade/fábrica.

## Antes da análise

1. Aplique o `AGENTS.md` ativo e leia as invariantes `INV-TEN-*` e `INV-AUTH-004/007` em `docs/ai/DOMAIN_INVARIANTS.md` quando disponíveis.
2. Fixe o modo: revisão de diff/PR, auditoria de fluxo ou desenho de testes. Em revisão, não atribua ao PR um desvio preexistente não agravado.
3. Identifique ator, papel, fábrica autorizada, recurso e como a posse direta ou derivada é resolvida.
4. Leia [references/protocol.md](references/protocol.md) antes de concluir.

## Limites

- `ADMIN` é operador global explícito; `PROPRIETARIO` e `GERENTE` são tenant. Não trate acesso global de `ADMIN` como vazamento, mas conteste endpoints globais alcançáveis por papéis tenant.
- ID de rota, query, body, storage ou estado do frontend não comprova autorização.
- Frontend pode revelar risco e contrato incorreto, mas não pode provar enforcement de segurança no backend.
- Não acesse dados reais, não publique finding e não implemente correção sem autorização separada.

## Entrega

Apresente mapa de superfícies verificadas, matriz A/B, findings mantidos e candidatos descartados. Cada finding deve obedecer ao contrato do FILO: severidade, confiança, localização, evidência, causa, exploração, impacto nos clientes, escopo, impacto existente, correção mínima segura, teste de regressão e limitações.

Se faltar código do backend, identidade ou relação de posse necessária, pare a conclusão afetada e declare a evidência necessária. Se nenhum caminho sobreviver à contestação, conclua `Nenhum finding de isolamento mantido`.
