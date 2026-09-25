# Protocolo de autenticação e autorização

## Matriz obrigatória

Para cada ação, registre:

| Ator/papel | Contexto de fábrica | Ação | Recurso/estado | Decisão esperada | Enforcement observado |
| ---------- | ------------------- | ---- | -------------- | ---------------- | --------------------- |

Inclua usuário não autenticado, `GERENTE`, `PROPRIETARIO`, `ADMIN`, sessão revogada e papel/fábrica alterado após emissão do token quando aplicável.

## Caminho de decisão

Siga o request desde:

1. parsing e autenticação;
2. strategy e conteúdo de `request.user`;
3. guards/decorators e precedência;
4. controller;
5. service e autorização por recurso;
6. query/constraint;
7. serialização e logs;
8. refresh, logout e invalidação.

Procure rotas sem guard, metadados ausentes, regras aplicadas só no frontend, claims obsoletas, alteração de papel/fábrica sem revogação, usuários tenant alcançando ações globais e mass assignment de campos de autoridade.

## Contestação

- Endpoint público intencional, como login, não é finding por não usar JWT.
- Acesso entre fábricas de `ADMIN` não é finding quando a operação é global, explícita e auditável.
- Guard de papel não comprova autorização por recurso.
- Validação de fábrica não substitui checagem da ação permitida.
- Em revisão de PR, dívida não tocada deve ser registrada como limitação, não atribuída ao autor.

## Contrato de saída

Cada finding contém severidade, confiança, invariantes, localização, evidência, causa, sequência de exploração, impacto/escopo de clientes, efeito no existente, correção mínima, regressão e limitações. Inclua ainda:

- matriz antes/depois quando o diff altera papéis;
- janela de revogação observada ou desconhecida;
- distinção entre autorização de plataforma e tenant;
- checks executados e não executados.
