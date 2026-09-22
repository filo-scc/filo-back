# Como Gheyson e Arthur validam a base de IA do FILO

## Registro da aprovação

| Validação                    | Situação                      | Data       |
| ---------------------------- | ----------------------------- | ---------- |
| Negócio e governança         | Aprovada por Gheyson          | 2026-08-29 |
| Revisão técnica independente | Pendente de Arthur Capistrano | —          |

A aprovação de Gheyson autoriza o versionamento local das propostas. Ela não autoriza push, abertura ou merge de pull request, deploy, migration, gate automático ou aceite de risco.

## 1. O que está sendo aprovado agora

As alterações estão somente nas branches locais `feature/ai-agents` do backend e do frontend. A validação descrita aqui responde apenas:

> Estes arquivos estão claros, seguros e coerentes o suficiente para serem versionados e enviados a pull requests?

Para essa decisão, a aprovação de Gheyson e Arthur Capistrano é suficiente.

Essa aprovação não significa que as skills já foram comprovadas em uso real. Elas continuam em estado `Proposta`. O piloto com Gheyson, Arthur e Érico é uma etapa posterior.

## 2. O problema de as alterações estarem locais

Arthur ainda não consegue ver os arquivos porque eles existem apenas no computador de Gheyson. O fluxo correto é:

1. Gheyson faz a validação de negócio descrita neste guia.
2. As mudanças de backend e frontend são colocadas em commits separados.
3. Os commits são enviados ao GitHub em dois pull requests.
4. Arthur baixa ou abre esses pull requests e executa a validação técnica.
5. Gheyson e Arthur registram a aprovação; somente depois disso os pull requests podem seguir o fluxo normal do time.

Não inclua nos commits os arquivos `email-boas-vindas-filo.html` e `email-update-sistema-filo.html`. Eles já estavam no frontend e não pertencem a esta implantação.

## 3. O que Gheyson precisa fazer

Gheyson não precisa ler scripts, arquivos JSON, YAML ou cópias repetidas. Sua responsabilidade é verificar se as regras dadas à IA representam o FILO e respeitam a autoridade humana.

### Passo 1 — confirmar as regras gerais dos agentes

Arquivos:

- `filo-back/AGENTS.md`;
- `filo-front/AGENTS.md`.

Esses dois arquivos dizem como a IA deve se comportar em cada repositório. Eles já foram aprovados por Gheyson anteriormente. Portanto, não é necessário reler tudo agora.

Releia somente se ainda houver dúvida sobre estes pontos:

- o que a IA pode fazer sozinha;
- o que exige autorização humana;
- o que é sempre proibido;
- isolamento entre fábricas;
- pedidos, fichas técnicas e Kanban;
- formato obrigatório dos problemas encontrados em revisões.

Resultado esperado: Gheyson confirma que nenhuma regra permite à IA decidir roadmap, merge, deploy, alteração de produção ou aceite de risco crítico/alto.

### Passo 2 — confirmar as regras do produto

Arquivo:

- `filo-back/docs/ai/DOMAIN_INVARIANTS.md`.

Esse documento registra as decisões sobre `ADMIN`, fábricas, pedidos, fichas, numeração, grades, Kanban, conclusão depois de 72 horas e arredondamento.

Gheyson já ratificou esse documento. Ele não precisa ser relido agora, a menos que Gheyson queira rever alguma decisão comercial.

Resultado esperado: as regras já ratificadas continuam valendo e nenhuma delas foi substituída silenciosamente.

### Passo 3 — conferir o resumo do sistema de IA

Arquivo:

- `filo-back/docs/ai/FILO_AI_BLUEPRINT.md`.

Não é necessário reler o documento inteiro. Leia somente:

- **Seção 9 — Catálogo de skills:** confira se as sete habilidades criadas fazem sentido para o FILO.
- **Seção 20 — Estado atual:** confira se o texto descreve honestamente o que já existe e o que ainda falta.
- **Seção 21 — Plano de implantação:** confira se nada foi marcado como concluído antes de realmente acontecer.
- **Seção 27 — Responsáveis:** confira nomes, titulares e substitutos.

Resultado esperado: Gheyson concorda com os objetivos das skills e confirma que todas continuam apenas como propostas, sem poder de aprovar ou bloquear entregas automaticamente.

### Passo 4 — dar a aprovação de Gheyson

Se os três passos anteriores estiverem corretos, basta registrar algo equivalente a:

> Validei as regras gerais, as decisões de produto, o catálogo das skills e os responsáveis. As skills podem ser versionadas como propostas, sem automação de merge, deploy, migration ou aceite de risco.

Isso encerra a validação de Gheyson para estes arquivos locais.

## 4. O que Arthur precisa fazer

Arthur faz a revisão técnica depois que os dois pull requests estiverem no GitHub. Ele não precisa decidir produto nem reler todas as cópias do frontend.

### Passo 1 — verificar se somente arquivos de IA foram alterados

Arthur abre a lista de arquivos dos dois pull requests e confirma:

- nenhum arquivo dentro de `src/`, `prisma/`, testes do produto, Docker ou configuração de produção foi alterado;
- o frontend não inclui os dois arquivos de e-mail que já existiam localmente;
- os pull requests contêm apenas `AGENTS.md`, `.agents/**` e `docs/ai/**` relacionados a esta implantação.

Se houver arquivo de produto ou arquivo sem relação, Arthur interrompe a revisão e pede sua retirada.

### Passo 2 — executar as verificações prontas

No backend, Arthur executa:

```powershell
node .agents/evals/validate-corpus.mjs
node .agents/evals/validate-skills.mjs
node .agents/evals/validate-sync.mjs
```

No frontend, Arthur executa:

```powershell
node .agents/evals/validate-corpus.mjs
node .agents/evals/validate-skills.mjs
```

Esses comandos respondem automaticamente:

- todos os arquivos obrigatórios existem?
- os nomes e descrições estão no formato correto?
- cada skill possui casos de teste suficientes?
- as cópias compartilhadas do backend e frontend são iguais?

Todos os comandos precisam terminar sem erro. Arthur não precisa conferir JSON ou YAML manualmente quando essas verificações estiverem verdes.

### Passo 3 — ler os sete arquivos principais das skills

Arthur lê somente estes arquivos no backend:

1. `.agents/skills/github-pr-review/SKILL.md`;
2. `.agents/skills/tenant-isolation-review/SKILL.md`;
3. `.agents/skills/authorization-review/SKILL.md`;
4. `.agents/skills/data-integrity-review/SKILL.md`;
5. `.agents/skills/prisma-migration-review/SKILL.md`;
6. `.agents/skills/api-contract-review/SKILL.md`;
7. `.agents/skills/kanban-transition-review/SKILL.md`.

Para cada arquivo, Arthur responde:

1. Está claro quando essa habilidade deve ser usada?
2. Está claro quando ela não deve ser usada?
3. Ela pede as evidências necessárias antes de acusar um problema?
4. Ela está impedida de alterar código, publicar comentário, fazer merge, deploy ou migration sem autorização?
5. Ela respeita as regras de fábricas, permissões, pedidos, fichas e Kanban?
6. A resposta que ela promete seria útil para um desenvolvedor corrigir o problema?

Se a resposta for “não” em qualquer item, Arthur aponta o arquivo e explica o que precisa mudar.

### Passo 4 — conferir os detalhes técnicos

Depois dos sete arquivos principais, Arthur lê o arquivo da pasta `references` de cada skill. Esses documentos detalham o passo a passo que a IA deve seguir.

Arthur não precisa comparar esses arquivos entre backend e frontend: `validate-sync.mjs` já faz essa comparação.

Arthur verifica principalmente:

- se os exemplos não contradizem o `SKILL.md`;
- se as correções propostas são pequenas e seguras;
- se falta algum risco técnico importante;
- se a IA deve parar quando não tiver informação suficiente.

### Passo 5 — conferir uma amostra dos casos de teste

Os 109 casos não são uma lista de leitura obrigatória. Arthur abre o `cases.json` de cada skill e confere somente três casos por skill:

- `P01`: existe um problema e a IA deve encontrá-lo;
- `N01`: o comportamento está correto e a IA não deve inventar problema;
- `S01`: faltam informações e a IA deve dizer que não consegue concluir.

Isso totaliza 21 casos. Arthur verifica se o resultado esperado faz sentido tecnicamente. Os demais casos ficam para o futuro piloto prático.

### Passo 6 — dar a aprovação de Arthur

Se tudo estiver correto, Arthur registra em cada pull request algo equivalente a:

> Revisei os sete contratos das skills, seus procedimentos técnicos e uma amostra dos casos. Executei os validadores de estrutura e sincronização sem erros. Não encontrei ampliação de permissão nem alteração no produto. Aprovo a entrada destes arquivos como propostas para piloto posterior.

Se houver ressalva, Arthur não aprova genericamente. Ele informa exatamente o arquivo, a regra e a correção necessária.

## 5. Arquivos que Gheyson e Arthur podem ignorar nesta aprovação

| Arquivos                                   | Por que podem ser ignorados manualmente                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| `.agents/evals/**/*.mjs`                   | São ferramentas automáticas; basta executar os comandos e observar o resultado |
| `.agents/evals/registry.json`              | Lista técnica conferida pelos validadores                                      |
| `.agents/evals/result-template.json`       | Modelo de registro para o futuro piloto                                        |
| `agents/openai.yaml` dentro de cada skill  | Metadados de apresentação e acionamento conferidos automaticamente             |
| Skills compartilhadas copiadas no frontend | O comparador garante que são idênticas ao backend                              |
| Todos os 109 casos de teste                | Arthur confere 21 agora; a execução integral pertence ao futuro piloto         |
| `docs/ai/PILOT_PROTOCOL.md`                | Será lido antes do piloto; não é necessário para versionar as propostas        |
| Arquivos de e-mail existentes no frontend  | Não pertencem a esta mudança e não devem entrar nos commits                    |

## 6. Quando a validação está concluída

Esta etapa termina quando:

1. Gheyson registra a aprovação de negócio e governança.
2. Arthur registra a aprovação técnica nos dois pull requests.
3. Os cinco comandos de validação terminam sem erro.
4. Nenhum arquivo alheio à implantação entra nos commits.
5. As skills permanecem marcadas como `Proposta`.

Depois disso, os arquivos podem ser integrados normalmente. O piloto comportamental é a próxima etapa e continua separado desta aprovação.
