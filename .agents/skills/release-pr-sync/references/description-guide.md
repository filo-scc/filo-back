# Guia da descrição do PR de release

Use este guia somente depois de confirmar que `develop` está à frente de `master` e que existe no máximo um PR correspondente.

## Evidências e síntese

Priorize, nesta ordem:

1. títulos e descrições de PRs incorporados no intervalo;
2. mensagens de commit e seus corpos;
3. nomes de arquivos, módulos e estatísticas do diff;
4. código alterado, quando necessário para esclarecer o comportamento.

Um ticket é válido apenas quando um identificador como `DEV-123` aparece nas evidências. Elimine duplicados e agrupe por domínio funcional. Só associe um título ao ticket se a mesma evidência estabelecer a associação; caso contrário, liste apenas o código.

## Seções

- **Descrição:** dois ou três parágrafos em português. Explique o objetivo da promoção e os principais resultados. Informe a contagem de tickets apenas quando ela for comprovável.
- **Tickets Jira:** agrupe por área. Se nenhum ticket for encontrado, escreva `Nenhum identificador Jira encontrado nas evidências do intervalo.`
- **Tipo de alteração:** marque bug, funcionalidade, alteração destrutiva e documentação conforme evidência; itens incertos permanecem desmarcados.
- **Objetivo:** lista numerada de resultados de negócio ou operação, não passos de implementação.
- **Atividades Realizadas:** use checkboxes marcados para mudanças comprovadas pelo diff, separadas em `Backend` ou `Frontend` conforme o repositório. Não misture entregas do outro repositório.
- **Checklist:** marque somente verificações comprovadas para o SHA atual. Não execute formatadores que reescrevem arquivos. Registre checks não executados como desmarcados.
- **Resumo:** informe números verificáveis de commits, arquivos e tickets, seguidos de uma síntese curta.

## Atualização idempotente

O trecho entre os marcadores HTML é gerenciado pela automação. Normalize `CRLF` para `LF`, remova espaços ao fim das linhas e garanta uma única quebra final antes de comparar.

Se um PR existente não tiver marcadores:

- conteúdo padrão do template, vazio ou genérico pode ser substituído;
- conteúdo humano substancial deve ser aproveitado na nova síntese;
- se a incorporação segura não for possível, não atualize e solicite revisão humana.

Nunca inclua hashes completos de commit no corpo, dados secretos, raciocínio interno ou afirmações sem evidência.

