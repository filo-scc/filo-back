# Protocolo de integridade de dados

## 1. Modele a operação

Registre:

- pré-condições e invariantes;
- dados recebidos e normalizações;
- leituras usadas para decidir;
- escritas no banco e ordem;
- efeitos externos;
- resposta de sucesso;
- compensação/rollback;
- comportamento de retry.

Para batch, valide o conjunto inteiro antes da primeira escrita ou documente atomicidade parcial aprovada. Para update, diferencie omitido, `null`, zero, `false` e vazio.

## 2. Falha e atomicidade

Induza/modelar falha:

1. após cada leitura decisória;
2. entre cada par de escritas;
3. depois do commit e antes da resposta;
4. antes/depois de efeito externo;
5. durante compensação.

Confirme que o estado anterior permanece ou que a recuperação é explícita, idempotente e observável. Uma transação apenas em parte do fluxo não prova atomicidade global.

## 3. Concorrência

Procure padrões read-then-write, `max + 1`, replace/delete+create, update por ID sem estado esperado e jobs com trava em memória. Teste duas criações, updates concorrentes, retry após timeout e disputa job×usuário.

Use constraint, operação atômica, isolamento/lock, versão otimista ou idempotency key conforme a causa. Não prescreva lock amplo sem avaliar contenção.

## 4. Valores e relações

- valide não negativos, limites e inteiros;
- preserve `Decimal` e `ROUND_HALF_UP` na escala contratada;
- mantenha maior precisão até a fronteira correta;
- reconcilie total da ficha com a matriz;
- valide fábrica e compatibilidade de todas as relações;
- avalie cascade/restrict/null e registros órfãos;
- assegure constraints compostas por fábrica onde a regra for tenant.

## 5. Saída

Para cada finding, além do contrato FILO, apresente estado antes, interleaving/falha concreta, estado incorreto resultante e propriedade que deveria permanecer verdadeira. O teste de regressão deve falhar antes e verificar banco e resposta depois.
