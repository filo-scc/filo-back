---
name: tenant-isolation-review
description: Auditar isolamento entre fábricas no backend, contratos do frontend, jobs, caches e relações derivadas do FILO. Use quando uma mudança ou investigação envolver fabrico_id, recursos tenant, IDs recebidos do cliente ou possível acesso cruzado; não use para revisão genérica sem superfície multi-tenant.
---

# Tenant Isolation Review

Encontre caminhos concretos de leitura, mutação ou associação entre fábricas e produza evidências acionáveis sem ampliar o escopo para uma auditoria genérica.

Use os parâmetros, permissões e o contrato de saída de [manifest.yaml](manifest.yaml). A skill é ativa e informativa; findings críticos/altos continuam sujeitos a decisão humana. Os casos comportamentais estão em [evals/evals.json](evals/evals.json) e os de acionamento em [evals/trigger-evals.json](evals/trigger-evals.json).

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

Siga as seções do manifest. Se faltar backend, identidade ou relação de posse, pare a conclusão afetada e declare a evidência necessária. Sem candidato sobrevivente, conclua `Nenhum finding de isolamento mantido`.
