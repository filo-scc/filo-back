# Perfil de contrato entre filo-back e filo-front

Use quando a mudança puder alterar o comportamento observável entre os repositórios.

## Comparação

Identifique endpoint, método, DTO/schema, produtor e todos os consumidores encontrados. Compare:

- campos, tipos, nulabilidade, valores omitidos e defaults;
- enums, datas, precisão decimal e serialização;
- status HTTP, forma dos erros e sucesso parcial;
- retry, idempotência, timeout e respostas fora de ordem;
- código antigo/novo com contrato antigo/novo durante a janela de deploy.

## Conclusão

Declare se a mudança é aditiva compatível, exige adaptação coordenada ou é incompatível. Quando necessário, proponha ordem de deploy e comportamento de rollback. Não trate coerção acidental do frontend como contrato e não invente o lado ausente.

Se houver PR pareado, registre URL e head SHA dos dois. Se o outro repositório não estiver disponível, limite a conclusão e diga exatamente qual consumidor, DTO ou versão precisa ser verificado.
