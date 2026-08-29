---
name: authorization-review
description: Revisar autenticação, papéis, autorização por ação/recurso e revogação de sessão no FILO. Use em mudanças de auth, guards, rotas protegidas, usuários, cargos ou capacidades administrativas; não substitui a análise especializada de isolamento quando o risco central for cruzamento entre fábricas.
---

# Authorization Review

Construa uma matriz ator × ação × recurso e verifique que o backend aplica a decisão vigente em todos os caminhos relevantes.

## Governança

- Estado: `Proposta`, candidata a piloto supervisionado.
- Owner: Gheyson.
- Revisão independente para risco crítico/alto: qualidade e segurança, com Lucas de Holanda como substituto.
- Evals: `.agents/evals/authorization-review/cases.json`.
- Revisar até 2026-11-30 ou após mudança de JWT, papéis ou sessões.

## Procedimento

1. Aplique o `AGENTS.md` e as invariantes `INV-AUTH-*`; leia [references/protocol.md](references/protocol.md).
2. Fixe o modo e o escopo. Em revisão de PR, separe regressão do diff de dívida preexistente.
3. Identifique autenticação, papel, fábrica, ação, recurso, estado da sessão e ponto efetivo de autorização.
4. Teste ou demonstre caminhos permitido, negado, sessão alterada e chamada direta à API.
5. Conteste cada candidato antes de emitir finding.

## Regras específicas do FILO

- `ADMIN` é operador global da plataforma; `PROPRIETARIO` e `GERENTE` são limitados à fábrica associada.
- Hoje nenhum usuário sem fábrica é legítimo; futuramente `ADMIN` poderá ter `fabrico_id = null` após implementação própria.
- Papel global deve ser explícito e auditável. Um `fabrico_id` técnico não concede nem restringe sozinho o poder de `ADMIN`.
- Interface oculta, rota privada ou ausência de botão não substitui enforcement do backend.

## Entrega e falha segura

Inclua matriz de autorização, sessão/revogação, findings completos, candidatos descartados, verificações e limitações. Não publique, não altere permissões e não implemente correção sem autorização.

Se o modelo de papéis, o guard efetivo ou o estado de sessão não estiver disponível, classifique o ponto como não comprovado e indique a evidência necessária. Não invente capacidade.
