# Padrão de qualidade das skills FILO

## 1. Finalidade

Este documento define o padrão mínimo para criar, revisar, instalar, promover e depreciar skills do FILO. Ele complementa, sem substituir, `AGENTS.md`, o Blueprint, as invariantes de domínio e o código real da versão analisada.

Uma skill é um procedimento reutilizável. Ela não recebe autoridade adicional por descrever uma ferramenta ou ação em seus metadados.

## 2. Fontes de verdade

Use esta ordem:

1. `AGENTS.md` do repositório ativo;
2. `docs/ai/FILO_AI_BLUEPRINT.md`;
3. `docs/ai/DOMAIN_INVARIANTS.md`;
4. `manifest.yaml` da skill;
5. `SKILL.md` e seus recursos;
6. código, contratos, schema e testes da versão analisada.

Se o manifesto e o `SKILL.md` divergirem, a skill está inválida. Não escolha silenciosamente uma versão.

## 3. Artefatos

### Obrigatórios

- `SKILL.md` com `name` e `description` válidos;
- `manifest.yaml` válido contra o schema do repositório;
- contrato de entrada e saída;
- exemplo positivo, negativo e de saída;
- evals compatíveis com o risco;
- owner, estado e data de revisão.

### Condicionais

- `agents/openai.yaml` quando a distribuição alvo o utilizar;
- `scripts/` para trabalho determinístico ou repetitivo;
- `assets/` para templates e artefatos de saída estáveis;
- `references/` para detalhes carregados sob demanda;
- `evals/files/` para fixtures sanitizadas.

## 4. Frontmatter

Mantenha o frontmatter portátil e pequeno:

```yaml
---
name: example-skill
description: Descreve o que a skill faz e quando deve ser usada, incluindo anti-gatilhos relevantes.
---
```

No OpenCode, os campos portáveis são `name`, `description`, `license`, `compatibility` e `metadata` textual. Permissões efetivas pertencem à configuração do agente ou projeto. Não inclua campos de plataforma sem comprovar suporte.

## 5. Descrição e acionamento

A `description` deve explicar o que a skill faz e quando consultá-la. Inclua palavras e superfícies que o usuário realmente menciona. Use anti-gatilho quando uma skill adjacente deve prevalecer.

Evite descrições tão amplas que todas as tarefas pareçam relevantes. Skills de entrada rígida podem exigir invocação explícita.

Teste o acionamento separadamente do comportamento após o acionamento.

## 6. Contrato de entrada

Classifique a entrada como:

- `strict`: formato fechado, validado antes de qualquer efeito;
- `contextual`: contexto flexível com evidências mínimas;
- `scripted`: argumentos consumidos por script determinístico.

Para cada parâmetro, declare nome, tipo, obrigatoriedade, origem, validação, default e exemplo. Declare também arquivos, contexto, precondições e evidências mínimas.

Não transforme uma revisão contextual em CLI artificial apenas para parecer reproduzível. Reprodutibilidade vem de evidências, fixtures, scripts determinísticos e contratos observáveis.

## 7. Contrato de saída

Declare:

- formato e artefato principal;
- seções e campos obrigatórios;
- resultado sem findings;
- resultado com evidência insuficiente;
- limitações obrigatórias;
- afirmações proibidas;
- exemplo reduzido, mas válido.

Uma saída deve permitir revisão humana e rastrear conclusões até evidências.

## 8. Procedimento

O `SKILL.md` deve:

1. aplicar as fontes de autoridade;
2. fixar escopo e modo;
3. validar entradas antes de efeitos;
4. coletar apenas o contexto necessário;
5. executar verificações determinísticas primeiro;
6. analisar e contestar candidatos;
7. produzir a saída contratada;
8. declarar limitações e checks não executados;
9. parar com segurança quando faltar evidência.

Explique o motivo de regras importantes. Use proibições fortes para limites de segurança e autoridade, não para compensar instruções ambíguas.

## 9. Permissões

O manifesto deve declarar o menor conjunto necessário de ferramentas e ações. Classifique cada controle:

- `documented`: orientação sem enforcement técnico;
- `enforced`: bloqueado ou permitido por configuração verificável;
- `human-gated`: exige autorização explícita na execução;
- `unsupported`: a plataforma não oferece o controle necessário.

Separe leitura, edição local, Bash, rede, diretórios externos, GitHub, banco e sistemas externos. Para Bash, prefira comandos ou famílias concretas a uma permissão genérica.

Uma skill não pode autorizar ação negada pelo `AGENTS.md`.

## 10. Recursos

### Scripts

Adicione um script quando ele reduzir erro ou repetição e puder produzir resultado determinístico. Documente argumentos, saída, código de erro, efeitos e fallback. Scripts destrutivos ou de produção não pertencem a uma skill por conveniência.

### Assets

Use para templates, ícones ou arquivos incorporados à saída. Marcadores devem ser validados e todos precisam ser substituídos no resultado final.

### References

Use para protocolos e conhecimento especializado. O `SKILL.md` deve dizer quando ler cada referência. Arquivos extensos devem possuir sumário.

## 11. Exemplos

Cada skill deve fornecer:

1. exemplo positivo realista;
2. exemplo negativo ou anti-gatilho;
3. exemplo resumido da saída válida.

Quando falha segura for relevante, acrescente exemplo de evidência insuficiente. Exemplos não substituem evals e não podem conter dados reais ou respostas ocultas do corpus.

## 12. Evals

O formato alvo é `evals/evals.json`, compatível com o Skill Creator. Preserve os conceitos FILO de categoria, resultado, severidade, invariantes, conteúdo obrigatório e conteúdo proibido.

Categorias mínimas para skills P0:

- cinco positivas;
- cinco negativas;
- três adversariais ou ambíguas;
- uma de prompt injection;
- uma de evidência insuficiente.

O executor não recebe o resultado esperado. A alteração da skill durante uma rodada invalida a rodada.

## 13. Comparação de versões

Ao melhorar uma skill:

1. capture a versão anterior fora da árvore instalada;
2. execute versão nova e antiga com o mesmo caso;
3. registre tempo e tokens;
4. aplique assertions objetivas;
5. preserve a rubrica humana para qualidade e segurança;
6. abra o viewer apenas com pares completos;
7. incorpore feedback sem ajustar o esperado depois de ver o resultado.

No workspace compatível com o viewer atual, nomeie os casos como `eval-0`, `eval-1` e assim por diante, mantendo o nome descritivo em `eval_metadata.json`. Use `with_skill` para a versão revisada e `without_skill` para a baseline. Quando a baseline for a skill anterior, declare isso em `benchmark.json`, pois o nome técnico não significa que a execução ocorreu sem instruções.

## 14. Composição

Declare skills complementares, concorrentes e mutuamente exclusivas. Explique ordem, condição de handoff e qual componente consolida a saída.

Uma skill orquestradora não deve copiar integralmente os procedimentos especialistas. Ela identifica risco, seleciona a revisão necessária e consolida evidências.

## 15. Portabilidade

O manifesto é comum. Cada adaptador deve mapear apenas recursos suportados pela plataforma. O validador precisa detectar quando uma permissão declarada não possui enforcement e mostrar isso como limitação.

Evite manter duas cópias editáveis da mesma skill. Quando uma cópia for necessária, defina origem canônica e valide igualdade.

## 16. Documentação HTML

O portal é gerado a partir dos manifestos e não é fonte de verdade. Deve mostrar fluxo, entrada, saída, cenários, exemplos, permissões, recursos, evals, estado e composição.

Fluxos que combinam várias skills devem ser declarados em `.agents/skill-standard/workflows.yaml`, com caixas distintas para ação, decisão, skill e validação humana. A sequência visual deve mostrar que uma decisão de risco seleciona apenas as skills aplicáveis e que merge, deploy e aceite de risco permanecem humanos.

Não edite o HTML manualmente. Corrija o manifesto ou o gerador.

## 17. Definition of Ready

Uma skill está pronta para avaliação quando:

- problema e owner estão definidos;
- contrato está validado;
- permissões estão revisadas;
- falha segura está descrita;
- exemplos existem;
- evals mínimos existem;
- fixtures estão sanitizadas;
- baseline foi preservada.

## 18. Definition of Done

Uma revisão termina quando:

- validações estáticas passam;
- amostra comparativa foi revisada por humano;
- feedback foi tratado;
- acionamento foi avaliado;
- corpus proporcional ao gate foi executado;
- custo, duração e limitações foram registrados;
- decisão de ciclo de vida foi tomada por responsável humano;
- nenhuma permissão, automação ou estado foi ampliado silenciosamente.
