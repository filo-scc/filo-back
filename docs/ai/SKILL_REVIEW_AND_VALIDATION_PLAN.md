# Plano de revisão e validação das skills FILO

## Controle

| Campo | Valor |
| --- | --- |
| Status | Em uso prático e melhoria contínua |
| Escopo | Skills canônicas do `filo-back`; e sincronização com `filo-front`|
| Fonte de governança | `AGENTS.md` e `docs/ai/FILO_AI_BLUEPRINT.md` |
| Padrão técnico | `docs/ai/SKILL_QUALITY_STANDARD.md` |
| Estratégia | Revisão integral, validação determinística e ajustes após uso real |

## 1. Objetivo

Revisar, melhorar e validar as oito skills existentes sem criar um padrão paralelo à governança ratificada do FILO. O trabalho deve tornar explícitos os contratos de entrada e saída, reduzir ambiguidades, aplicar menor privilégio, preservar o corpus de avaliação e medir se cada revisão melhora o comportamento e o acionamento da skill.

Nenhuma pontuação autoriza publicação, merge, deploy, migration, acesso a dados reais ou promoção automática de ciclo de vida.

## 2. Escopo inicial

As skills serão tratadas por risco e dependência:

1. `tenant-isolation-review`;
2. `authorization-review`;
3. `data-integrity-review`;
4. `prisma-migration-review`;
5. `api-contract-review`;
6. `kanban-transition-review`;
7. `github-pr-review`;
8. `filo-update-email`.

O `filo-back` é a fonte canônica nesta etapa. A sincronização das skills compartilhadas com o frontend será tratada separadamente para evitar duas fontes concorrentes.

## 3. Decisões do planejamento

- O padrão será portável entre OpenCode e Codex, com um núcleo canônico e adaptadores específicos.
- Cada skill terá um `manifest.yaml` como fonte de contrato, governança, recursos e permissões.
- O `SKILL.md` continuará sendo a fonte do procedimento executado pelo agente.
- Parâmetros obrigatórios e opcionais serão descritos no contrato; scripts terão argumentos formais apenas quando o trabalho for determinístico.
- O acesso seguirá menor privilégio por skill.
- A documentação será escrita em português, com chaves técnicas em inglês.
- O catálogo HTML será gerado localmente e não será versionado.
- O corpus atual será substituído pelo formato do Skill Creator somente após uma prova de compatibilidade sem perda semântica.
- As skills revisadas entram como `ativa-informativa`, sem autoridade automática de gate, merge, deploy ou aceite de risco.
- O corpus completo será preservado e validado estruturalmente; calibração comportamental será ajustada após uso real.
- O padrão será referenciado pelo `AGENTS.md`; validação em CI será tratada em uma fase posterior e exigirá autorização própria.

## 4. Arquitetura dos artefatos

Estrutura alvo de uma skill:

```text
.agents/skills/<skill>/
├── SKILL.md
├── manifest.yaml
├── agents/
│   └── openai.yaml
├── evals/
│   ├── evals.json
│   ├── trigger-evals.json
│   └── files/
├── references/
├── assets/
└── scripts/
```

Pastas opcionais só devem existir quando houver conteúdo útil. Diretórios vazios e abstrações sem consumidor não fazem parte do padrão.

Fluxos que atravessam mais de uma skill são declarados em `.agents/skill-standard/workflows.yaml`. Cada etapa informa se representa ação, decisão, uso de skill ou validação humana. O portal apresenta essas etapas como caixas conectadas por setas e não mantém uma segunda cópia manual do fluxo no HTML.

## 5. Fases

### Fase 0 - baseline

1. Inspecionar `git status --short` e preservar alterações locais.
2. Registrar commit, modelo, configuração e versões das skills.
3. Executar os validadores atuais sem reescrever arquivos.
4. Capturar uma cópia temporária da skill antes de editá-la.
5. Registrar lacunas de estrutura, contrato, exemplos, recursos e evals.

Saída: inventário verificável e baseline preservada.

### Fase 1 - padrão e contrato

1. Ratificar `SKILL_QUALITY_STANDARD.md`.
2. Criar `manifest.schema.json`, `manifest.template.yaml` e `workflows.yaml`.
3. Definir perfis de permissão e o significado de `documented`, `enforced`, `human-gated` e `unsupported`.
4. Criar validador local sem adicionar dependências.
5. Usar `tenant-isolation-review` como referência de estrutura para os demais manifests.

Saída: contrato canônico validável.

### Fase 2 - migração determinística dos evals

1. Converter os corpora legados para `evals/evals.json` compatível com o Skill Creator.
2. Preservar o corpus completo de cada skill.
3. Preservar ID FILO, categoria, resultado, severidade, invariantes, obrigações e proibições.
4. Validar os arquivos com o validador local e com as ferramentas disponíveis do Skill Creator.
5. Não remover o `cases.json` enquanto houver consumidor legado.

Saída: corpus integral migrado sem perda estrutural detectada.

### Fase 3 - ferramentas locais

1. Validar manifestos, caminhos, exemplos e evals.
2. Criar conversor integral do corpus após a prova da fase 2.
3. Criar gerador determinístico do catálogo HTML.
4. Atualizar a validação de sincronização entre backend e frontend.
5. Executar tudo localmente antes de propor integração em CI.

Saída: validações reproduzíveis sem depender de julgamento do modelo.

### Fase 4 - revisão por ondas

Para cada skill:

1. revisar objetivo e não objetivos;
2. revisar gatilhos, anti-gatilhos e sobreposição;
3. formalizar entradas, precondições e falhas seguras;
4. formalizar o contrato de saída;
5. declarar ferramentas, comandos e permissões;
6. revisar o procedimento e suas justificativas;
7. avaliar `scripts/`, `assets/` e `references/`;
8. adicionar exemplo positivo, negativo e de saída;
9. migrar evals;
10. executar validação determinística integral;
11. coletar feedback durante o uso real;
12. iterar quando forem observados falsos positivos, falsos negativos ou ambiguidades.

Saída: versão ativa-informativa, sujeita a melhoria contínua.

### Fase 5 - acionamento

1. Criar cerca de vinte consultas reais por skill.
2. Equilibrar casos que devem e não devem acionar.
3. Incluir near-misses e concorrência entre skills.
4. Submeter o conjunto ao usuário antes da execução.
5. Rodar `skill_eval` e `skill_optimize_loop`.
6. Aplicar uma nova descrição somente se ela melhorar o conjunto retido sem ampliar falsos positivos.

Saída: descrição com evidência de precisão de acionamento.

### Fase 6 - qualificação integral

1. Executar todos os casos da skill revisada e da baseline.
2. Graduar expectativas e a rubrica FILO.
3. Consolidar precisão, recall crítico, falsos bloqueios, aderência, estabilidade, custo e duração.
4. Exigir revisão secundária para resultados críticos e altos.
5. Registrar decisão humana de ciclo de vida.

Saída: relatório de qualificação por skill.

### Fase 7 - distribuição e institucionalização

1. Reconciliar os artefatos compartilhados do frontend.
2. Definir origem canônica e processo de distribuição.
3. Gerar o portal consolidado.
4. Referenciar o padrão no `AGENTS.md`.
5. Atualizar Blueprint, runbook e rubrica quando a mudança for ratificada.
6. Propor CI em entrega separada.

Saída: padrão durável e aplicável a novas skills.

## 6. Execução dos evals

Durante iterações, a amostra deve conter pelo menos:

- um caso positivo;
- um caso negativo;
- um adversarial;
- um de prompt injection;
- um de evidência insuficiente;
- um caso da principal invariante da skill, se ainda não estiver coberto.

Cada caso terá execução da versão revisada e da versão anterior. No workspace do viewer, use diretórios `eval-0`, `eval-1` e assim por diante; preserve o nome descritivo em `eval_metadata.json`. O schema atual do plugin aceita apenas as configurações `with_skill` e `without_skill`, portanto `without_skill` representa a versão anterior durante melhoria de uma skill existente. Registre essa semântica no benchmark para não confundi-la com uma execução sem instruções.

Os pares são obrigatórios antes de abrir o viewer. Duração e tokens devem ser capturados quando cada execução terminar. Se a ferramenta não os fornecer, registre `null` e a limitação; nunca estime ou represente ausência como execução de custo zero.

O ciclo de revisão usa:

1. `grading.json` por execução;
2. `skill_aggregate_benchmark` para consolidação;
3. análise de assertions não discriminantes e variação;
4. `skill_serve_review` para feedback humano;
5. `feedback.json` como entrada da próxima iteração.

## 7. Critérios de recursos auxiliares

Crie um script quando houver transformação determinística, validação mecânica ou trabalho repetido em diferentes execuções. Crie um asset quando a saída exigir estrutura editorial ou visual estável. Crie uma referência quando conhecimento extenso só for necessário em parte dos cenários.

Não crie recursos apenas para preencher a estrutura alvo.

## 8. Critérios de aceite por skill

- manifesto válido e coerente com o `SKILL.md`;
- objetivo, não objetivos, gatilhos e anti-gatilhos claros;
- entradas obrigatórias e opcionais explícitas;
- saída verificável e exemplo correspondente;
- falha segura definida;
- permissões mínimas declaradas e enforcement descrito honestamente;
- exemplo positivo, negativo e de saída;
- evals comportamentais e de acionamento revisados;
- comparação pareada concluída;
- feedback humano tratado;
- limitações e dependências registradas;
- nenhuma ação proibida ou prompt injection obedecida.

## 9. Promoção

Continuam válidos os critérios do Blueprint, inclusive 100% de detecção dos críticos conhecidos, precisão mínima de 80% e falsos bloqueios abaixo de 5% para candidatura a gate. A revisão acrescentará evidência de aderência contratual, acionamento, estabilidade, custo e duração, mas não criará novos thresholds normativos sem ratificação humana.

## 10. Riscos e controles

| Risco | Controle |
| --- | --- |
| Perda semântica na migração | Prova de compatibilidade antes de remover o formato antigo |
| Overfitting | Amostra variada, conjunto retido e corpus integral no gate |
| Permissão apenas declarada | Mostrar separadamente intenção e enforcement |
| Mutação externa em eval | Fixtures, mocks, dry-run e ausência de credenciais |
| Drift do HTML | Gerar somente a partir dos manifestos |
| Drift entre repositórios | Origem canônica e comparação determinística |
| Custo excessivo | Amostra por iteração e corpus completo apenas na qualificação |
| Scripts sem benefício | Exigir justificativa e consumidor concreto |

## 11. Incremento atual

O primeiro incremento contém:

- este plano;
- o padrão de qualidade;
- schema, template e validador;
- manifests e exemplos das oito skills canônicas;
- corpora comportamentais convertidos integralmente e casos de acionamento;
- portal HTML mínimo gerado localmente;
- atualização do contrato de entrada de `github-pr-review` para comando ou URL canônica;
- guia curto de uso e fluxos integrados.

O uso prático alimentará ajustes posteriores; promoção para gate continua fora deste incremento.
