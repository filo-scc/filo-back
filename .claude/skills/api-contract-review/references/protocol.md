# Protocolo de contrato de API

## 1. Descubra o contrato real

No backend, siga controller, DTO, pipes/transformação, service, Prisma/serialização, filtros de erro e testes. No frontend, siga service HTTP, normalização, página/componente, estado, formulário, cache, impressão e testes/fixtures.

Não limite a análise ao tipo declarado. O contrato observável inclui:

- método e rota;
- autenticação/capacidade;
- path, query, headers e body;
- nome, tipo, enum, nulabilidade e obrigatoriedade;
- `omitido` versus `null`, zero, `false` e vazio;
- data, timezone, Decimal e arredondamento `ROUND_HALF_UP`;
- status HTTP e forma do erro;
- idempotência, paginação e ordenação;
- efeitos colaterais e momento em que sucesso é confirmado.

## 2. Matriz produtor × consumidor

| Elemento | Backend antes/depois | Frontend antes/depois | Compatibilidade | Evidência |
| -------- | -------------------- | --------------------- | --------------- | --------- |

Classifique cada mudança como aditiva compatível, comportamento alterado, remoção/rename, endurecimento de validação, mudança de erro ou mudança de precisão.

## 3. Janela de deploy

Teste conceitualmente:

1. front antigo + back antigo;
2. front antigo + back novo;
3. front novo + back antigo;
4. front novo + back novo.

Defina expansão/backfill/contração quando necessário. Se apenas uma ordem for segura, declare-a e explique rollback. Para campo obrigatório novo, prefira aceitar ambos os formatos antes de exigir o novo consumidor.

## 4. Contestação e saída

Descarte diferenças internas não observáveis e campos adicionais ignorados com segurança. Mantenha finding quando houver caminho concreto para falha, persistência diferente da tela, erro tratado como sucesso ou incompatibilidade na janela de deploy.

Cada finding deve conter o contrato FILO completo e a combinação de versões afetada. A correção mínima deve preservar convivência ou declarar coordenação inseparável com rollback verificável.
