---
name: github-pr-review
description: Revisar pull requests do GitHub neste repositório quando o PR for informado como `gh pr checkout` seguido de número positivo, validar riscos em duas passagens e produzir um relatório Markdown com findings verificáveis sem alterar código nem publicar comentários.
---

# GitHub PR Review

Produza uma revisão técnica verificável e proporcional ao risco. A entrega é somente o documento Markdown local; não implemente correções e não publique reviews ou comentários no GitHub.

## Governança

- Estado: `Proposta`, candidata a piloto supervisionado.
- Owner: Gheyson.
- Revisão independente para risco crítico/alto: qualidade e segurança, com Lucas de Holanda como substituto.
- Evals: `.agents/evals/github-pr-review/cases.json`.
- Invocação somente explícita devido ao contrato rígido de entrada.
- Revisar até 2026-11-30 ou após mudança do fluxo de PR/GitHub.

## Entrada obrigatória

Exija que o identificador do PR seja informado exatamente como:

```text
gh pr checkout <numero-positivo>
```

Aceite esse comando acompanhado do pedido de revisão ou da invocação `$github-pr-review`, mas rejeite número isolado, URL, branch, número zero, flags ou mais de um comando. Se a entrada for inválida, informe o formato esperado e pare antes do checkout e da criação do documento.

## Preparação

1. Confirme que o diretório atual pertence a um repositório Git, que `gh` está disponível e que o acesso ao PR funciona.
2. Inspecione `git status --short`. Preserve alterações locais: nunca descarte, sobrescreva, faça stash ou reset. Se elas impedirem o checkout, reporte o bloqueio.
3. Execute o comando fornecido e obtenha com `gh pr view` pelo menos título, URL, base, branch, head, commits e arquivos alterados.
4. Use `review-pr-<numero>.md` na raiz. Se existir, trate-o como rascunho: revalide todo o conteúdo contra o head atual e atualize-o sem duplicar apontamentos.
5. Leia [references/review-protocol.md](references/review-protocol.md) antes de analisar o PR e use [assets/review-template.md](assets/review-template.md) como estrutura da entrega.
6. Aplique o `AGENTS.md` ativo. Quando a área alterada possuir governança em `docs/ai`, consulte somente as referências necessárias para classificar o risco e verificar invariantes.

Se o PR, o checkout ou os metadados não puderem ser verificados, não fabrique uma revisão. Explique o bloqueio e não crie um documento que pareça concluído.

## Revisão

Faça duas passagens independentes:

1. Na primeira, levante candidatos a partir do diff completo, histórico, código relacionado, testes e contratos disponíveis.
2. Na segunda, confronte cada candidato com o head, a base, o comportamento preexistente e as evidências disponíveis. Mantenha apenas problemas reais, atribuíveis ao PR ou riscos de compatibilidade concretos.

Verifique especialmente isolamento entre fábricas, autorização, pedidos, fichas técnicas, transferências do Kanban, integridade de dados, migrations e contratos entre frontend e backend quando o diff puder afetá-los. Marque cada área como afetada, não afetada ou limitada por falta de evidência; não simule cobertura de uma área fora do escopo.

Consulte repositórios ou contratos relacionados somente quando estiverem disponíveis e forem necessários para validar uma hipótese. Não invente o comportamento do outro repositório.

Execute checks proporcionais ao projeto, como `git diff --check`, testes, lint, format check, typecheck ou build. Não instale dependências sem autorização. Diferencie falha causada pelo PR de limitação do ambiente e registre os comandos e resultados no documento.

Não transforme preferência de estilo, refatoração opcional ou problema preexistente sem agravamento em pedido de correção deste PR. Registre de forma resumida os candidatos descartados e a evidência do descarte.

## Entrega

Para cada finding mantido, inclua todos os campos definidos no template:

- título orientado ao efeito;
- severidade e confiança;
- localização e evidência;
- problema e causa técnica;
- exploração possível ou declaração de que não se aplica;
- impacto nos clientes e escopo afetado;
- impacto no comportamento existente;
- correção mínima segura;
- teste de regressão;
- limitações e verificações pendentes;
- mensagem curta para o PR.

Finding de confiança baixa não deve ser mantido como correção: registre a hipótese em limitações ou entre os candidatos descartados, com a verificação necessária. Crítico e alto são bloqueadores potenciais, nunca decisões automáticas de merge.

Substitua todos os marcadores `{{...}}` do template, repita o bloco numerado para cada apontamento e não deixe instruções ou marcadores de preenchimento no documento final. Quando uma seção obrigatória não tiver itens, registre isso explicitamente em vez de manter exemplos fictícios.

A mensagem curta deve:

- explicar o efeito concreto em poucas frases;
- conter uma ação sugerida proporcional ao problema;
- terminar em tom colaborativo, normalmente como `Podemos ...?` ou `Faz sentido ...?`;
- ser autocontida e pronta para copiar;
- evitar afirmar como certeza o que não foi comprovado.

Se nenhum candidato sobreviver à segunda passagem, remova o bloco de finding de exemplo e ainda produza o documento com metadados, cobertura de risco, verificações, limitações, candidatos descartados e a conclusão `Nenhum finding mantido`.
