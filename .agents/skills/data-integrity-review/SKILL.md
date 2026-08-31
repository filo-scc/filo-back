---
name: data-integrity-review
description: Auditar integridade de dados do backend FILO em operações compostas, batch, cálculos, exclusões, jobs e concorrência. Use quando mudanças puderem produzir estado parcial, duplicidade, perda de atualização ou precisão incorreta; não substitui prisma-migration-review quando o foco for evolução do schema/deploy.
---

# Data Integrity Review

Verifique invariantes persistidas e comportamento sob falha, repetição e concorrência, propondo apenas a correção mínima segura.

## Governança

- Estado: `Proposta`, candidata a piloto supervisionado.
- Owner: Gheyson.
- Substitutos: Arthur Capistrano para backend e Lucas de Holanda para qualidade/segurança.
- Escopo: `filo-back` e contratos consumidos pelo frontend quando necessários à prova.
- Evals: `.agents/evals/data-integrity-review/cases.json`.
- Revisar até 2026-11-30 ou após mudança relevante no modelo transacional.

## Procedimento

1. Aplique `INV-DATA-*`, `INV-ORD-*`, `INV-FT-*` e o `AGENTS.md`.
2. Leia [references/protocol.md](references/protocol.md).
3. Defina o estado válido antes/depois e todas as escritas, leituras e efeitos externos da operação.
4. Verifique validação integral, transação, constraints, retry, concorrência, precisão e exclusão.
5. Induza ou modele falha em cada fronteira; conteste candidatos contra comportamento real e testes.

## Regras vigentes

- Número de pedido e ficha é único e incremental por fábrica, nunca global.
- Quantidade da ficha é a soma da matriz; métricas de perdas/retiradas/sobras/defeitos são separadas inicialmente.
- Arredondamento é comercial `ROUND_HALF_UP`, com escala explícita no contrato.
- Política geral de retenção/soft delete ainda está pendente; não amplie hard delete por conveniência.

## Entrega e falha segura

Inclua mapa de estado, fronteiras transacionais, cenários de falha/concorrência, findings completos, descartes e limitações. Não aplique migration, seed, reset ou escrita em banco compartilhado. Se a atomicidade depender de serviço externo ou isolamento de banco não disponível, declare o ponto não comprovado.
