# Invariantes de domínio e segurança do FILO

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | `FILO-DOMAIN-INVARIANTS` |
| Versão | `1.0` |
| Status | Ratificado |
| Data de referência | 2026-08-28 |
| Ratificação | Gheyson, em 2026-08-28 |
| Fonte canônica | `filo-back/docs/ai/DOMAIN_INVARIANTS.md` |
| Responsável | Gheyson |
| Substituto técnico, produto, backend e frontend | Arthur Capistrano |
| Substituto de qualidade e segurança | Lucas de Holanda |
| Escopo | Backend, frontend, banco, jobs, integrações e automações do FILO |

Este documento transforma os princípios do Blueprint em regras verificáveis. Ele não define roadmap nem cria regra comercial nova: registra o que deve permanecer verdadeiro para proteger os clientes e destaca decisões de negócio que ainda precisam de ratificação.

## 1. Autoridade e linguagem normativa

Este documento deve ser lido junto com:

1. `AGENTS.md` do repositório em execução;
2. `docs/ai/FILO_AI_BLUEPRINT.md`;
3. schema, migrations, contratos, código e testes da versão analisada.

Os termos **DEVE**, **NÃO DEVE** e **EXIGE** são normativos. Quando código e documento divergirem, a divergência é risco a tratar; não é autorização para uma IA alterar silenciosamente a regra nem para declarar conformidade inexistente.

Cada ID é estável e deve aparecer em testes, findings, ADRs, PRs e exceções relacionadas. Uma mudança de redação que altere a proteção exige nova versão e aprovação dos responsáveis aplicáveis.

## 2. Estados de conformidade

| Estado | Significado |
|---|---|
| Garantida | Há enforcement no backend ou banco e teste negativo suficiente para o risco. |
| Parcial | Parte do fluxo possui enforcement, mas existe caminho equivalente sem a proteção. |
| Não comprovada | A regra pode estar correta, porém falta evidência determinística. |
| Violada | Existe caminho concreto que contradiz a regra. |
| Não aplicável | O componente não executa nem influencia a operação protegida. |

Lint, build, tipagem ou interface ocultando uma ação não comprovam uma invariante de autorização ou integridade.

## 3. Severidade de uma violação

| Severidade | Critério |
|---|---|
| Crítica | Leitura ou mutação entre fábricas, perda/corrupção relevante de dados, comprometimento de conta, indisponibilidade central ou ação destrutiva sem recuperação razoável. |
| Alta | Autorização indevida relevante, quebra de pedido/ficha/Kanban, persistência parcial, concorrência com perda silenciosa ou contrato incompatível com impacto significativo. |
| Média | Inconsistência recuperável, caso de borda provável ou degradação restrita com contorno seguro. |
| Baixa | Defeito comprovado e localizado sem impacto significativo em fluxo central. |

Uma exceção aceita deve possuir responsável, justificativa, prazo, compensações e referência rastreável. Risco crítico ou alto não pode ser aceito apenas pela mesma pessoa que implementou a mudança.

## 4. Modelo de posse por fábrica

### 4.1 Raízes de posse

`Fabrico` é a raiz do isolamento. Possuem `fabrico_id` direto no schema atual:

- `Usuario`, `Parceiro`, `Cliente`, `Etapa`, `Produto`, `FichaTecnica`, `Cor`, `Tecido`, `Aviamento`, `Pedido` e `TipoProduto`;
- `FabricoGrade` associa uma grade compartilhada a uma fábrica.

`ADMIN` é o operador global da plataforma FILO e não representa função interna de uma fábrica. No modelo desejado, contas `ADMIN` podem ter `Usuario.fabrico_id = null`; `PROPRIETARIO` e `GERENTE` devem estar associados a uma fábrica. No estado atual, contas administrativas ainda usam uma fábrica técnica criada em produção como solução transitória. Essa associação não deve ser usada como fonte do privilégio global e sua remoção exige implementação e migration próprias.

### 4.2 Posse derivada

Recursos sem `fabrico_id` próprio herdam a fábrica de uma raiz já autorizada:

| Recurso | Posse derivada por |
|---|---|
| `ProdutoAviamento` | `produto.fabrico_id` e `aviamento.fabrico_id`, que devem coincidir |
| `ClienteProduto` | `produto.fabrico_id` e `cliente.fabrico_id`, que devem coincidir |
| `parceiroProduto` | `produto.fabrico_id` e `parceiro.fabrico_id`, que devem coincidir |
| `FichaParceiro` | `ficha.fabrico_id` e `parceiro.fabrico_id`, que devem coincidir |
| `FichaEtapa` | `ficha_tecnica.fabrico_id` e `etapa.fabrico_id`, que devem coincidir |
| `FichaTecnicaItem` | `ficha_tecnica.fabrico_id`; a cor deve ser da mesma fábrica e o item deve pertencer à versão de grade da ficha |
| `GradeVersao` e itens | grade compartilhada autorizada para a fábrica e para o produto/ficha conforme política aprovada |

`Tamanho`, `Grade`, `GradeVersao`, `GradeItem`, `GradeVersaoItem` e `Icone` são compartilhados no schema. “Compartilhado” significa catálogo controlado, não permissão automática para alterar ou vincular qualquer registro.

## 5. Invariantes de isolamento entre fábricas

| ID | Regra normativa | Prova mínima | Severidade se violada |
|---|---|---|---|
| `INV-TEN-001` | Toda leitura ou mutação de recurso com posse direta ou derivada DEVE ser limitada à fábrica autorizada. | Teste com fábricas A/B para listar, ler, criar, atualizar e excluir. | Crítica |
| `INV-TEN-002` | A fábrica autorizada DEVE vir da identidade autenticada ou de uma capacidade administrativa explícita; ID de rota, query ou corpo NÃO DEVE provar acesso. | Teste altera apenas o ID fornecido pelo cliente e recebe resposta indistinguível de “não encontrado”. | Crítica |
| `INV-TEN-003` | Relações criadas ou atualizadas DEVEM possuir a mesma fábrica em todas as pontas, antes da escrita. | Testes cruzam cliente, produto, parceiro, etapa, cor, pedido e ficha entre A/B. | Crítica |
| `INV-TEN-004` | Listagens, buscas, relatórios, exports, uploads, caches e jobs DEVEM aplicar o mesmo isolamento. | Consulta e artefato resultante contêm exclusivamente dados da fábrica autorizada. | Crítica |
| `INV-TEN-005` | Erros NÃO DEVEM permitir enumerar a existência de recurso de outra fábrica. | Mesmo status e forma de erro para ID inexistente e ID alheio. | Alta |
| `INV-TEN-006` | `fabrico_id` de recurso existente NÃO DEVE ser trocado por payload comum. Transferência administrativa exige operação dedicada, autorização explícita, auditoria e validação integral das relações. | DTO não aceita o campo ou service o ignora/rejeita; teste cobre tentativa. | Crítica |
| `INV-TEN-007` | Service compartilhado NÃO DEVE depender apenas do controller para receber escopo seguro. | Unidade de domínio/service exige contexto autorizado e falha sem ele. | Alta |
| `INV-TEN-008` | Cache e estado do cliente DEVEM ser limpos ou particionados ao trocar usuário, sessão ou fábrica. | Teste de logout/login A→B não exibe nem reutiliza dados de A. | Crítica |

## 6. Invariantes de autenticação e autorização

| ID | Regra normativa | Prova mínima | Severidade se violada |
|---|---|---|---|
| `INV-AUTH-001` | Toda ação protegida EXIGE autenticação válida e autorização para a ação e o recurso. | Matriz negativa por papel e por fábrica. | Crítica/Alta |
| `INV-AUTH-002` | Papel e fábrica usados na autorização DEVEM refletir o estado vigente ou possuir janela de validade e revogação formalmente aceita. | Alterar papel/fábrica/revogar sessão impede acesso dentro do limite aprovado. | Alta |
| `INV-AUTH-003` | Frontend NÃO É fronteira de autorização. Guardas de rota e botões ocultos apenas complementam o backend. | Chamada direta à API continua bloqueada. | Crítica/Alta |
| `INV-AUTH-004` | `ADMIN` é operador global da plataforma. Ações globais DEVEM exigir explicitamente esse papel/capacidade, usar endpoint distinguível e possuir trilha de auditoria; `fabrico_id` real ou técnico não concede esse privilégio. | Testes de `ADMIN` sobre múltiplas fábricas e negação para papéis tenant. | Crítica |
| `INV-AUTH-005` | Senha, hash, JWT, refresh token, secret e dados sensíveis NÃO DEVEM aparecer em resposta, log ou fixture versionada. | Teste de serialização e inspeção de logs/fixtures. | Crítica/Alta |
| `INV-AUTH-006` | Alteração de papel, fábrica, credencial ou refresh token DEVE considerar invalidação das sessões incompatíveis. | Teste de sessão já emitida após a mudança. | Alta |
| `INV-AUTH-007` | `PROPRIETARIO` e `GERENTE` DEVEM operar somente na fábrica associada. Ausência de fábrica é inválida para esses papéis; no modelo futuro, somente `ADMIN` pode operar sem associação. | Matriz por papel com e sem fábrica e tentativas A/B. | Crítica |

## 7. Invariantes de pedidos

| ID | Regra normativa | Prova mínima | Severidade se violada |
|---|---|---|---|
| `INV-ORD-001` | Número do pedido DEVE ser único por fábrica e sua alocação DEVE ser segura sob concorrência. | Constraint composta e teste com criações simultâneas. | Alta |
| `INV-ORD-002` | Cliente associado ao pedido DEVE pertencer à mesma fábrica. | Criação e edição com cliente de B são rejeitadas para usuário de A. | Crítica |
| `INV-ORD-003` | Todas as operações de pedido, inclusive listagem, leitura, edição, exclusão e busca por cliente, DEVEM usar a fábrica autorizada. | Matriz A/B para cada endpoint. | Crítica |
| `INV-ORD-004` | `quantidade`, `valor_total` e `custo_total` NÃO DEVEM aceitar valores negativos, `NaN`, infinito ou precisão incompatível. | Testes de limites no DTO, domínio e persistência. | Alta |
| `INV-ORD-005` | Cada endpoint/operação DEVE calcular explicitamente os valores que persiste ou devolve. O mesmo conceito de total NÃO DEVE produzir resultados divergentes entre endpoints, e o arredondamento deve seguir `INV-DATA-004`. | Testes com múltiplos itens, endpoints equivalentes e casos de arredondamento. | Alta |
| `INV-ORD-006` | Vínculo entre pedido e fichas DEVE preservar a mesma fábrica. Após `finalizado = true`, os dados do pedido NÃO DEVEM ser editados. Reabertura ou exclusão permanecem negadas por padrão até política específica. | Testes de vínculo cruzado, edição bloqueada e comportamento conservador para reabertura/exclusão. | Crítica/Alta |
| `INV-ORD-007` | Repetição após timeout NÃO DEVE criar pedido duplicado nem retornar sucesso incompatível. | Teste de retry com chave idempotente ou mecanismo equivalente. | Alta |

## 8. Invariantes de fichas técnicas

| ID | Regra normativa | Prova mínima | Severidade se violada |
|---|---|---|---|
| `INV-FT-001` | Produto, pedido opcional e ficha DEVEM pertencer à mesma fábrica. | Testes A/B de criação e edição. | Crítica |
| `INV-FT-002` | Etapa atual, histórico, cores e parceiros DEVEM pertencer à fábrica da ficha. | Testes cruzados para cada relação. | Crítica |
| `INV-FT-003` | Item de grade DEVE pertencer exatamente à `grade_versao_id` da ficha. A grade só está autorizada para a fábrica quando existe `FabricoGrade` correspondente. | Teste com item de outra versão e grade sem `FabricoGrade`. | Alta |
| `INV-FT-004` | Só pode existir uma combinação `(ficha, cor, item de grade)` e operações repetidas DEVEM ser idempotentes ou falhar claramente. | Constraint composta e teste de retry. | Alta |
| `INV-FT-005` | `FichaTecnica.quantidade` DEVE ser igual à soma das quantidades da matriz de cores e tamanhos. Perdas, retiradas, sobras e defeitos são métricas separadas e inicialmente não alteram essa igualdade. Todos esses números DEVEM ser inteiros e não negativos. | Testes de limites, soma da matriz e independência das métricas auxiliares. | Alta |
| `INV-FT-006` | Substituir/sincronizar matriz, cores, parceiros ou grade DEVE validar o conjunto completo e confirmar atomicamente. | Falha induzida no meio preserva o estado anterior. | Alta |
| `INV-FT-007` | Alterar produto ou grade de ficha existente EXIGE política explícita para itens, custos, parceiros e histórico; não pode deixar referências incompatíveis. | Teste de migração de grade e rollback da transação. | Alta |
| `INV-FT-008` | Número da ficha DEVE ser incremental e único **por fábrica**, nunca global, e ser alocado com segurança concorrente. Fábricas diferentes podem possuir simultaneamente as fichas `1`, `2`, etc. | Constraint composta `(fabrico_id, numero)` e teste simultâneo dentro e entre fábricas. | Alta |
| `INV-FT-009` | Excluir ficha DEVE respeitar autorização, política de retenção e efeitos em pedido, itens, parceiros e histórico. | Teste de impacto e recuperação/auditoria prevista. | Crítica/Alta |

## 9. Invariantes do Kanban e das etapas

| ID | Regra normativa | Prova mínima | Severidade se violada |
|---|---|---|---|
| `INV-KAN-001` | Transição DEVE ser uma operação de backend única com ficha, origem esperada, destino, ator e contexto de fábrica. | Teste chama a API sem depender de sequência coordenada pelo frontend. | Alta |
| `INV-KAN-002` | Origem informada DEVE coincidir com o estado atual persistido e o destino DEVE ser etapa ativa da mesma fábrica. | Testes de origem obsoleta, etapa inativa e etapa de B. | Crítica/Alta |
| `INV-KAN-003` | Uma ficha pode avançar para qualquer etapa ativa posterior, inclusive pulando etapas. Ela NÃO PODE retornar a uma etapa anterior e não existe conclusão manual. O backend decide essa política comparando a ordem persistida. | Testes de avanço simples, salto permitido, retorno negado e tentativa de conclusão manual. | Alta |
| `INV-KAN-004` | Estado atual e histórico DEVEM ser atualizados atomicamente. Uma falha não pode encerrar a origem sem iniciar o destino, nem criar histórico sem mover a ficha. | Falha induzida em cada escrita dentro de transação. | Alta |
| `INV-KAN-005` | `data_inicio <= data_fim`; no máximo uma etapa pode estar aberta quando a política exigir fluxo linear. | Constraint/regra de domínio e testes temporais. | Alta |
| `INV-KAN-006` | Retry da mesma transição DEVE retornar o mesmo resultado ou conflito explícito, sem duplicar histórico. | Teste de repetição após timeout. | Alta |
| `INV-KAN-007` | Duas transferências concorrentes NÃO DEVEM sobrescrever uma à outra silenciosamente. | Teste concorrente com update condicional, versão ou lock. | Alta |
| `INV-KAN-008` | Efeitos auxiliares da transferência — custos, parceiros, perdas e relatórios — DEVEM integrar a mesma atomicidade ou possuir compensação observável. | Teste de falha parcial e reconciliação. | Alta |
| `INV-KAN-009` | O job DEVE marcar a ficha como concluída e retirá-la do Kanban 72 horas após sua entrada na última etapa. Ele DEVE ser idempotente, escopado por fábrica, seguro em múltiplas instâncias e atualizar ficha/histórico atomicamente. | Testes antes/no/depois do limite de 72 horas e execuções paralelas/repetidas. | Alta |
| `INV-KAN-010` | Ao entrar na última etapa, a ficha DEVE registrar `produzida_em` atomicamente com a transição. Esse marco significa “produzida”; `concluida` representa a retirada posterior pelo job. | Teste da transição à última etapa, retry e falha parcial; `produzida_em` e histórico permanecem coerentes. | Alta |

`produzida_em` está sendo implementado em um PR separado e ainda não integra o snapshot usado no mapeamento de 2026-08-28. Até o merge e a verificação desse PR, `INV-KAN-010` permanece não comprovada e o release deve tratar a dependência explicitamente.

## 10. Invariantes de dados, precisão e migrações

| ID | Regra normativa | Prova mínima | Severidade se violada |
|---|---|---|---|
| `INV-DATA-001` | Constraints DEVEM representar unicidade, referência e domínio quando o banco puder garantir a regra. | Schema/migration e teste de violação direta. | Alta |
| `INV-DATA-002` | Operação composta DEVE usar transação ou compensação explícita, idempotente e testada. | Falha induzida não deixa metade do estado confirmada. | Alta |
| `INV-DATA-003` | `Cascade`, `Restrict`, `SetNull` e hard delete DEVEM refletir política de retenção e impacto conhecida. | Testes de exclusão de cada raiz crítica. | Crítica/Alta |
| `INV-DATA-004` | Valores monetários e custos DEVEM usar precisão decimal explícita ponta a ponta; conversão para ponto flutuante exige prova de segurança. | Casos de centavos, três casas e somas repetidas. | Alta |
| `INV-DATA-005` | DTOs DEVEM distinguir campo ausente, `null`, zero, `false` e string vazia conforme o contrato. | Teste de patch/update para cada estado permitido. | Alta/Média |
| `INV-DATA-006` | Migration incompatível EXIGE expansão, backfill idempotente, verificação, contração e plano de rollback. | Ensaio em cópia/snapshot e consulta de verificação. | Crítica/Alta |
| `INV-DATA-007` | Escrita concorrente em recurso crítico EXIGE conflito detectável, serialização ou operação comutativa segura. | Teste concorrente determinístico. | Alta |
| `INV-DATA-008` | Backfill e job DEVEM expor progresso, falha e contagem verificável sem registrar dado sensível. | Logs/métricas estruturados e execução repetida. | Alta/Média |

O schema atual usa `Decimal` para a maior parte dos custos e totais, mas `ClienteProduto.preco_padrao` e `parceiroProduto.preco` usam `Float`. Essa divergência deve ser tratada como risco de precisão até decisão e migration próprias; este documento não autoriza conversão automática.

### 10.1 Política de cálculo e arredondamento

- Cada endpoint/operação é responsável pela fórmula dos valores que produz, e a fórmula deve estar explícita no código e nos testes.
- O arredondamento numérico é comercial, no modo `ROUND_HALF_UP`.
- A escala deve respeitar a semântica do campo e a precisão do schema/contrato. O desenvolvedor pode propor a escala apropriada, mas, depois de publicada, ela vira contrato e não pode divergir entre endpoints que representam o mesmo conceito.
- Cálculos devem preservar a maior precisão necessária até a fronteira de persistência ou apresentação; não se deve arredondar cada parcela prematuramente sem regra de negócio.
- Zeros decimais não significativos podem ser ocultados apenas na apresentação. Persistência e payload continuam obedecendo à escala contratada.
- Valores monetários não devem depender de ponto flutuante binário quando isso puder alterar o resultado comercial.

## 11. Invariantes de contrato entre frontend e backend

| ID | Regra normativa | Prova mínima | Severidade se violada |
|---|---|---|---|
| `INV-API-001` | Campo, tipo, enum, nulabilidade, data, precisão e semântica de erro DEVEM coincidir nos dois repositórios. | Teste de contrato ou fixture versionada validada pelos dois lados. | Alta |
| `INV-API-002` | Mudança incompatível DEVE declarar ordem de deploy e janela de convivência. | Plano front/back/banco e teste com versões adjacentes. | Alta |
| `INV-API-003` | Sucesso de interface só pode ser exibido após confirmação integral do resultado esperado. | Falha parcial mantém estado recuperável e mensagem honesta. | Alta |
| `INV-API-004` | Reenvio, duplo clique e resposta fora de ordem NÃO DEVEM duplicar ou reverter silenciosamente uma operação. | Testes de latência, retry e concorrência. | Alta |
| `INV-API-005` | Estado/cache otimista DEVE reconciliar com o backend e reverter quando a confirmação falhar. | Teste de erro e resposta obsoleta. | Média/Alta |

## 12. Protocolo mínimo de verificação

Para declarar conformidade de fluxo crítico:

1. criar fábrica A e fábrica B com usuários e recursos equivalentes;
2. executar caminho feliz autorizado;
3. repetir cada leitura e mutação de A usando IDs de B;
4. repetir com papel insuficiente e sessão revogada/alterada;
5. testar payload ausente, `null`, zero, negativo, duplicado e obsoleto conforme o campo;
6. induzir falha entre escritas de operação composta;
7. executar retry e duas operações concorrentes;
8. verificar banco, resposta, histórico, logs e estado apresentado no frontend;
9. registrar IDs das invariantes cobertas pelo teste.

Para isolamento, um teste positivo não substitui o teste cruzado. Para atomicidade, mock unitário isolado não substitui ao menos um teste de integração com transação real.

## 13. Controles positivos observados

O mapeamento também encontrou controles úteis que devem ser preservados e ampliados:

- `PedidoService.create` valida o cliente na fábrica autenticada, e o schema possui unicidade de `(fabrico_id, numero)`;
- `FichaTecnicaService.create` exige que o produto pertença à fábrica autenticada;
- `FichaTecnicaService.update` recusa editar ficha alheia e valida a fábrica da etapa quando ela é alterada;
- criação e operações batch de `FichaTecnicaItem` validam cor na fábrica da ficha e item na versão de grade;
- substituição e sincronização de matriz usam transação em caminhos relevantes;
- `FichaParceiroService` compara ficha, parceiro e fábrica autenticada nos fluxos mapeados;
- o job de conclusão seleciona fábrica e última etapa por fábrica e atualiza ficha/histórico em uma transação por lote.

Esses controles não tornam seguros os caminhos paralelos descritos abaixo. Uma invariante só é garantida quando não há rota equivalente capaz de contorná-la.

## 14. Desvios observados na implementação de referência

Este inventário foi produzido durante o mapeamento de 2026-08-28. É evidência inicial para triagem, não uma auditoria completa do repositório. A correção não faz parte desta entrega documental.

### `DEV-001` — pedidos podem ser lidos ou excluídos sem escopo autenticado

- **Severidade:** Crítica.
- **Invariantes:** `INV-TEN-001`, `INV-TEN-002`, `INV-ORD-003`.
- **Evidência:** `src/pedido/pedido.controller.ts` expõe listagem, leitura, exclusão e filtros por IDs; `src/pedido/pedido.service.ts` executa `findMany`, `findUnique` e `delete` sem combinar o recurso com a fábrica autenticada em parte desses caminhos. Na edição, o pedido é escopado, mas o novo cliente é validado apenas pelo ID.
- **Exploração possível:** usuário autenticado de uma fábrica consulta ou remove pedido de outra fábrica ao usar endpoint geral ou trocar um identificador previsível; também pode vincular ao próprio pedido um cliente de outra fábrica.
- **Impacto nos clientes:** exposição de pedidos, clientes, valores e datas; exclusão ou indisponibilidade operacional de dados de outra fábrica; relações cruzadas e relatórios inconsistentes.
- **Escopo afetado:** todas as fábricas alcançáveis pelos endpoints enquanto IDs forem enumeráveis ou conhecidos.
- **Correção mínima segura:** remover listagem global do fluxo tenant; passar contexto autenticado ao service e usar filtros compostos/validação de posse em toda leitura e mutação; responder como não encontrado para recurso alheio.
- **Teste de regressão:** usuário de A não lista, lê, filtra nem exclui pedido de B; usuário de B preserva o acesso legítimo.

### `DEV-002` — fichas técnicas possuem leituras e exclusão sem escopo autenticado

- **Severidade:** Crítica.
- **Invariantes:** `INV-TEN-001`, `INV-TEN-002`, `INV-FT-009`.
- **Evidência:** `src/ficha-tecnica/ficha-tecnica.controller.ts` aceita fábrica, etapa ou ficha pela rota em `findAllByFabricoId`, `findAllByEtapaId`, `findOne` e `remove`; esses services não recebem a fábrica do usuário.
- **Exploração possível:** usuário autenticado troca o ID da fábrica, etapa ou ficha para visualizar detalhes ou excluir ficha alheia.
- **Impacto nos clientes:** vazamento de produção, produto, cliente, grade, parceiros, custos e histórico; perda de ficha de outra fábrica.
- **Escopo afetado:** fichas e relações retornadas pelos includes dos endpoints vulneráveis.
- **Correção mínima segura:** derivar a fábrica de `req.user`, exigir o contexto em todos os services e filtrar/validar ficha e etapa pela mesma fábrica antes de carregar relações ou excluir.
- **Teste de regressão:** matriz A/B para listagem por fábrica, por etapa, detalhe e exclusão.

### `DEV-003` — itens de ficha confiam no ID da ficha/item, não na fábrica do ator

- **Severidade:** Crítica.
- **Invariantes:** `INV-TEN-001`, `INV-TEN-007`, `INV-FT-002`, `INV-FT-003`.
- **Evidência:** `src/ficha-tecnica/ficha-tecnica-item.controller.ts` não passa identidade/fábrica aos métodos. `findAll`, replace, update, remove, clear e sincronizações inferem a fábrica do recurso alvo, mas não a comparam com a fábrica do usuário. `update` também permite trocar cor/item de grade sem repetir as validações relacionais da criação.
- **Exploração possível:** usuário autenticado que conhece o ID de ficha ou item alheio lê, substitui ou remove sua matriz; no update, pode vincular cor ou item incompatível.
- **Impacto nos clientes:** vazamento e corrupção de quantidades, cores e grade; produção calculada com matriz inconsistente.
- **Escopo afetado:** todos os endpoints de item, cor e matriz de ficha.
- **Correção mínima segura:** exigir contexto de fábrica em cada método; localizar ficha/item dentro desse escopo; centralizar e reutilizar a validação de cor e versão de grade em create/update/batch.
- **Teste de regressão:** A não lê nem altera item/ficha de B e update rejeita cor de B ou item de outra versão.

### `DEV-004` — histórico de etapas permite relações cruzadas e operações alheias

- **Severidade:** Crítica.
- **Invariantes:** `INV-TEN-003`, `INV-FT-002`, `INV-KAN-002`, `INV-KAN-004`.
- **Evidência:** `src/ficha-tecnica/ficha-etapa.controller.ts` não passa a fábrica autenticada. `createFichaEtapa` e `updateFichaEtapa` validam somente existência de ficha e etapa, sem exigir que pertençam à mesma fábrica ou ao ator; leitura e exclusão também usam somente IDs.
- **Exploração possível:** criar vínculo entre ficha de A e etapa de B ou ler/editar/excluir histórico de ficha alheia.
- **Impacto nos clientes:** vazamento, Kanban incoerente, histórico corrompido e conclusão automática incorreta.
- **Escopo afetado:** histórico e movimentação de todas as fichas.
- **Correção mínima segura:** criar operação de domínio escopada que valide ator, ficha, origem e destino na mesma fábrica; bloquear CRUD genérico de histórico para o fluxo comum.
- **Teste de regressão:** matriz A/B e tentativa de relacionar ficha/etapa de fábricas diferentes.

### `DEV-005` — transferência do Kanban é uma sequência não atômica coordenada pelo frontend

- **Severidade:** Alta.
- **Invariantes:** `INV-KAN-001`, `INV-KAN-004`, `INV-KAN-006`, `INV-KAN-007`, `INV-KAN-008`, `INV-API-003`.
- **Evidência:** `src/components/fichas-tecnicas/TransferenciaEtapaModal.jsx` atualiza custos/parceiros, encerra a etapa anterior, cria a nova etapa e depois atualiza `etapa_atual_id` em chamadas HTTP separadas.
- **Exploração possível:** falha de rede, timeout, duplo envio ou duas transferências simultâneas interrompem a sequência em estados diferentes.
- **Impacto nos clientes:** cartão em coluna divergente do histórico, etapa aberta/fechada incorretamente, custo parcial e retrabalho manual.
- **Escopo afetado:** toda transferência de ficha no quadro de produção.
- **Correção mínima segura:** endpoint único de transferência no backend, transação contendo estado/histórico e estratégia explícita para efeitos auxiliares; origem esperada e token idempotente/controle de versão.
- **Teste de regressão:** falha em cada subetapa, retry e duas transferências concorrentes preservam um único estado coerente.

### `DEV-006` — papéis tenant podem alcançar usuários e etapas fora da própria fábrica

- **Severidade:** Crítica.
- **Invariantes:** `INV-TEN-002`, `INV-TEN-006`, `INV-AUTH-001`, `INV-AUTH-004`.
- **Evidência:** `src/auth/auth.controller.ts` autoriza `PROPRIETARIO` junto com `ADMIN`, enquanto `auth.service.ts` possui listagem/consulta/edição/exclusão por IDs sem limitar a fábrica do proprietário. `src/etapa/etapa.controller.ts` expõe listagem geral e operações por ID a usuários autenticados sem escopo por fábrica.
- **Exploração possível:** `PROPRIETARIO` usa ID de outra fábrica para enumerar ou alterar usuários; usuário tenant consulta ou altera etapas de outra fábrica. O acesso global legítimo de `ADMIN` não elimina o bypass dos demais papéis.
- **Impacto nos clientes:** exposição de usuários, alteração de acesso ou fluxo produtivo e quebra do Kanban entre fábricas.
- **Escopo afetado:** contas e configuração de etapas acessíveis aos papéis autorizados nos controllers.
- **Correção mínima segura:** separar capacidade global de `ADMIN` das operações tenant; para `PROPRIETARIO`/`GERENTE`, derivar fábrica do ator e impor posse no service. Operações globais devem exigir explicitamente `ADMIN` e auditoria.
- **Teste de regressão:** matriz por papel/fábrica: `ADMIN` acessa o escopo global aprovado; proprietário/gerente de A não alcança usuários ou etapas de B.

### `DEV-007` — access token usa papel e fábrica do JWT mesmo após consultar o usuário

- **Severidade:** Alta.
- **Invariantes:** `INV-AUTH-002`, `INV-AUTH-006`.
- **Evidência:** `src/auth/strategies/jwt.strategy.ts` consulta o usuário, mas retorna `cargo` e `fabrico_id` do payload do token para autorização.
- **Exploração possível:** sessão emitida antes de remoção de papel ou troca de fábrica continua usando claims antigas durante a validade do access token.
- **Impacto nos clientes:** janela de autorização indevida após mudança administrativa.
- **Escopo afetado:** endpoints protegidos por cargo ou fábrica do access token.
- **Correção mínima segura:** definir janela de revogação aceita; usar estado vigente do usuário ou versão de sessão/claims invalidável em ações críticas.
- **Teste de regressão:** token emitido antes de alterar papel/fábrica perde capacidade dentro do limite formal.

### `DEV-008` — numeração da ficha por fábrica não possui constraint composta nem alocação concorrente

- **Severidade:** Alta.
- **Invariantes:** `INV-FT-008`, `INV-DATA-001`, `INV-DATA-007`.
- **Evidência:** `FichaTecnica.numero` não tem unicidade no schema; `FichaTecnicaService.create` calcula o próximo número a partir da última ficha antes da transação.
- **Exploração possível:** duas criações simultâneas escolhem o mesmo número.
- **Impacto nos clientes:** duas fichas da mesma fábrica podem receber o mesmo número, causando identificação ambígua, erro operacional, impressão e associação manual incorretas. Repetir o número em fábricas diferentes é correto e não constitui impacto.
- **Escopo afetado:** fábricas com criação concorrente ou retry.
- **Correção mínima segura:** adicionar `@@unique([fabrico_id, numero])` e alocar por sequência/contador transacional ou retry seguro. NÃO adicionar unicidade global em `numero`.
- **Teste de regressão:** criações paralelas na mesma fábrica produzem números distintos; fábricas A e B podem possuir, cada uma, as fichas `1` e `2`.

### `DEV-009` — validações numéricas de pedidos e fichas estão incompletas

- **Severidade:** Alta.
- **Invariantes:** `INV-ORD-004`, `INV-FT-005`, `INV-DATA-005`.
- **Evidência:** `CreatePedidoDto.quantidade`, `valor_total` e `custo_total`, e `CreateFichaTecnicaDto.quantidade`, não impõem mínimo não negativo; o schema também não possui checks correspondentes.
- **Exploração possível:** cliente envia quantidade ou total negativo que passa pela validação estrutural.
- **Impacto nos clientes:** totais, capacidade e relatórios incorretos; saldo/produção semanticamente inválidos.
- **Escopo afetado:** criação e atualizações derivadas por `PartialType` desses DTOs.
- **Correção mínima segura:** aplicar limites no DTO e regra de domínio, adicionar constraint quando compatível e rejeitar valores não finitos/fora da precisão.
- **Teste de regressão:** negativos e números inválidos falham; zero permanece aceito somente onde a regra permitir.

### `DEV-010` — job de conclusão tem trava apenas por processo

- **Severidade:** Alta.
- **Invariantes:** `INV-KAN-009`, `INV-DATA-007`.
- **Evidência:** `src/cronjobs/concluir-fichas-cron.ts` usa booleano em memória para impedir sobreposição local; duas instâncias do backend podem executar o mesmo lote. A transação por fábrica é positiva, mas não substitui coordenação distribuída.
- **Exploração possível:** escala horizontal, restart ou execução simultânea no startup e cron processam candidatos concorrentes.
- **Impacto nos clientes:** datas finais diferentes, contagens/logs enganosos e disputa com transferência manual.
- **Escopo afetado:** fichas na última etapa por mais de 72 horas.
- **Correção mínima segura:** lock distribuído/advisory lock ou update condicional que reivindique candidatos; incluir fábrica e estado esperado em todos os updates.
- **Teste de regressão:** duas instâncias concorrentes e retry concluem cada ficha uma única vez sem sobrescrever mudança manual.

### `DEV-011` — criação e edição de ficha não validam pedido na mesma fábrica

- **Severidade:** Crítica.
- **Invariantes:** `INV-TEN-003`, `INV-FT-001`, `INV-ORD-006`.
- **Evidência:** `CreateFichaTecnicaDto` recebe `pedido_id`; `FichaTecnicaService.create` espalha o DTO na criação depois de validar produto/fábrica, mas não valida o pedido. `update` também aceita campos derivados do DTO sem validar a fábrica do pedido informado. A criação ainda aceita `etapa_atual_id` sem aplicar a validação de fábrica presente no update.
- **Exploração possível:** usuário autenticado cria ou edita ficha da própria fábrica vinculando pedido ou etapa de outra fábrica por ID.
- **Impacto nos clientes:** vazamento por relações carregadas, ficha aparecendo em pedido/Kanban alheio, histórico e produção cruzados entre clientes.
- **Escopo afetado:** criação e edição de fichas e todos os includes/relatórios que percorrem esses vínculos.
- **Correção mínima segura:** antes da escrita, buscar pedido e etapa com `id + fabrico_id` autenticado; rejeitar vínculo alheio como não encontrado; considerar constraint/trigger apenas se compatível com o modelo de posse.
- **Teste de regressão:** usuário de A não cria nem edita ficha usando pedido ou etapa de B; vínculos legítimos de A continuam funcionando.

## 15. Registro de decisões de negócio e arquitetura

As decisões abaixo foram ratificadas por Gheyson em 2026-08-28, exceto onde o status indica pendência. Para uma decisão pendente, vale o padrão mais restritivo que preserve o cliente.

| ID | Decisão | Status |
|---|---|---|
| `DEC-AUTH-001` | `ADMIN` é operador global do FILO e não papel interno de fábrica. | Ratificada |
| `DEC-AUTH-002` | Hoje nenhum usuário sem fábrica é legítimo. No modelo futuro, `ADMIN` poderá ter `fabrico_id = null`; proprietário e gerente não. A fábrica técnica atual é solução transitória. | Ratificada; implementação futura |
| `DEC-KAN-001` | Ficha pode avançar e pular etapas posteriores, nunca retornar. Não existe conclusão manual. | Ratificada |
| `DEC-KAN-002` | Entrada na última etapa registra `produzida_em`; o job marca `concluida` e retira a ficha do Kanban após 72 horas. | Ratificada; PR de `produzida_em` pendente de merge/verificação |
| `DEC-FT-001` | Quantidade da ficha é a soma da matriz. Perdas, retiradas, sobras e defeitos são números separados inicialmente. | Ratificada |
| `DEC-FT-002` | Número de ficha e de pedido é incremental e único dentro de cada fábrica; fábricas diferentes mantêm sequências próprias iniciando em `1`. | Ratificada |
| `DEC-FT-003` | Uma grade está liberada para a fábrica quando existe a relação `FabricoGrade`. | Ratificada |
| `DEC-ORD-001` | Pedido finalizado não pode ser editado. O campo ainda não é aplicado adequadamente e a implementação está prevista para a próxima sprint. Reabertura e exclusão não foram definidas e ficam negadas por padrão. | Ratificada quanto à edição; implementação e decisões complementares pendentes |
| `DEC-DATA-001` | Política de soft delete, retenção e auditoria por entidade ainda não foi definida. Até lá, mudança destrutiva exige análise explícita e não pode ampliar hard delete por conveniência. | Pendente |
| `DEC-DATA-002` | Cada endpoint calcula seus valores; arredondamento comercial `ROUND_HALF_UP`, com escala coerente com o campo. A escolha técnica deve ser explícita, testada e consistente para o mesmo conceito. | Ratificada |

## 16. Gate de mudança e lançamento

Uma mudança que toca uma invariante deve:

- declarar os IDs afetados no PR;
- mostrar enforcement no backend/banco quando aplicável;
- incluir testes proporcionais à severidade;
- explicar compatibilidade e ordem de deploy entre front, back e banco;
- listar desvio temporário e compensações;
- receber revisão humana independente para risco crítico ou alto.

Um release NÃO DEVE ser declarado seguro quando introduz nova violação crítica/alta ou amplia um desvio conhecido sem aceitação formal. Desvios preexistentes devem permanecer visíveis e priorizados por risco, sem permitir que a IA decida o roadmap.

## 17. Aprovação e histórico

| Versão | Data | Alteração | Aprovação |
|---|---|---|---|
| `1.0-rc1` | 2026-08-28 | Primeira formalização, baseada no schema e nos fluxos atuais de autenticação, pedidos, fichas, Kanban e job de conclusão. | Proposta |
| `1.0` | 2026-08-28 | Ratificação das invariantes e decisões; esclarecimento de numeração por fábrica, papel global de `ADMIN`, transições, `produzida_em`, finalização e arredondamento. | Gheyson |
