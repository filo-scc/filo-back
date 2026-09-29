---
name: data-integrity-review
description: Auditar integridade de dados do backend FILO em operações compostas, batch, cálculos, exclusões, jobs e concorrência. Use quando mudanças puderem produzir estado parcial, duplicidade, perda de atualização ou precisão incorreta; não substitui prisma-migration-review quando o foco for evolução do schema/deploy.
---

# Data Integrity Review

Verifique invariantes persistidas e comportamento sob falha, repetição e concorrência, propondo apenas a correção mínima segura.

Use os parâmetros, permissões e o contrato de saída de [manifest.yaml](manifest.yaml). A skill é ativa e informativa; não executa escrita em banco.

## Procedimento

1. Aplique `AGENTS.md`, `INV-DATA-*`, `INV-ORD-*` e `INV-FT-*`; valide a entrada.
2. Leia [references/protocol.md](references/protocol.md).
3. Defina o estado válido antes/depois e todas as escritas, leituras e efeitos externos da operação.
4. Verifique validação integral, transação, constraints, retry, concorrência, precisão e exclusão.
5. Induza ou modele falha em cada fronteira; conteste candidatos contra comportamento real e testes.

## Regras vigentes

- Número de pedido e ficha é único e incremental por fábrica, nunca global.
- Quantidade da ficha é a soma da matriz; métricas de perdas/retiradas/sobras/defeitos são separadas inicialmente.
- Arredondamento é comercial `ROUND_HALF_UP`, com escala explícita no contrato.
- Política geral de retenção/soft delete ainda está pendente; não amplie hard delete por conveniência.

## Entrega

Siga as seções do manifest. Não aplique migration, seed, reset ou escrita em banco compartilhado. Se a prova depender de serviço externo ou isolamento de banco indisponível, declare o ponto não comprovado.
