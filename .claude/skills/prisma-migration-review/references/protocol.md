# Protocolo de migration Prisma/PostgreSQL

## 1. Inventário

Para cada alteração, registre:

| Objeto | Antes | Depois | Dados existentes | Operação SQL | Risco |
| ------ | ----- | ------ | ---------------- | ------------ | ----- |

Cubra tabela/model, coluna/campo, tipo/precisão, nulabilidade/default, enum, índice, unique, foreign key, onDelete/onUpdate e rename versus drop+add.

## 2. Compatibilidade de deploy

Avalie:

- código antigo + schema antigo;
- código antigo + schema expandido;
- código novo + schema expandido;
- código novo + schema contraído.

Mudança incompatível deve preferir:

1. expansão compatível;
2. deploy que escreve/lê os dois formatos quando necessário;
3. backfill idempotente em lotes;
4. verificação quantitativa e semântica;
5. troca de leitura;
6. contração posterior.

Declare ordem e ponto de rollback. Quando rollback de dados não for seguro, diga-o explicitamente e forneça contenção/restore.

## 3. Operação e locks

Analise tamanho estimado, table rewrite, validação de constraint, criação de índice, lock mode, timeout, transação, duração e impacto em conexões. Não prometa operação “sem downtime” sem versão e plano verificáveis.

Backfill deve possuir seleção estável, lote, checkpoint, retry, idempotência, observabilidade e consulta de verificação. Dados incompatíveis existentes devem ser tratados antes de `NOT NULL`, unique ou FK restritiva.

## 4. Particularidades FILO

- Unicidade de números é composta por fábrica, nunca global.
- Relações tenant devem impedir pontas de fábricas diferentes; Prisma FK simples pode não garantir isso sozinho.
- Dinheiro/custo usa Decimal na escala contratada e `ROUND_HALF_UP`; conversão de `Float` exige plano de dados e contrato.
- `Cascade` ou hard delete não deve ser ampliado enquanto a política de retenção estiver pendente.

## 5. Saída

Cada finding usa o contrato FILO e inclui caminho de dados existentes, momento do deploy que falha, impacto/escopo, correção mínima, verificação SQL conceitual ou teste, e limitação operacional. Separe risco de migration, risco do código e decisão de negócio pendente.
