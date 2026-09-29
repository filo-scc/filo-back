---
name: authorization-review
description: Revisar autenticação, papéis, autorização por ação/recurso e revogação de sessão no FILO. Use em mudanças de auth, guards, rotas protegidas, usuários, cargos ou capacidades administrativas; não substitui a análise especializada de isolamento quando o risco central for cruzamento entre fábricas.
---

# Authorization Review

Construa uma matriz ator × ação × recurso e verifique que o backend aplica a decisão vigente em todos os caminhos relevantes.

Use os parâmetros, permissões e o contrato de saída de [manifest.yaml](manifest.yaml). Esta skill é ativa e informativa; findings críticos/altos continuam sujeitos a decisão humana.

## Procedimento

1. Aplique o `AGENTS.md` e `INV-AUTH-*`; valide a entrada e leia [references/protocol.md](references/protocol.md).
2. Fixe modo e escopo. Em PR, separe regressão do diff de dívida preexistente.
3. Identifique autenticação, papel, fábrica, ação, recurso, estado da sessão e ponto efetivo de autorização.
4. Teste ou demonstre caminhos permitido, negado, sessão alterada e chamada direta à API.
5. Conteste cada candidato antes de emitir finding.

## Regras específicas do FILO

- `ADMIN` é operador global da plataforma; `PROPRIETARIO` e `GERENTE` são limitados à fábrica associada.
- Hoje nenhum usuário sem fábrica é legítimo; futuramente `ADMIN` poderá ter `fabrico_id = null` após implementação própria.
- Papel global deve ser explícito e auditável. Um `fabrico_id` técnico não concede nem restringe sozinho o poder de `ADMIN`.
- Interface oculta, rota privada ou ausência de botão não substitui enforcement do backend.

## Entrega

Siga as seções do manifest. Não publique, altere permissões ou implemente correções sem autorização. Se modelo de papéis, guard efetivo ou sessão não estiver disponível, classifique o ponto como não comprovado e peça a evidência necessária.
