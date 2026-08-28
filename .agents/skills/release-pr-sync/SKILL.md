---
name: release-pr-sync
description: Criar ou sincronizar o pull request de release de develop para master no GitHub, gerando uma descrição consolidada e verificável a partir dos commits e do diff. Use em monitoramentos recorrentes ou quando o PR de promoção precisar ser criado ou atualizado; não faça merge nem altere código.
---

# Release PR Sync

Mantenha exatamente um PR aberto de `develop` para `master` quando `develop` estiver à frente. Use o conector GitHub como fonte remota principal e limite as mutações à criação do PR ou à atualização de seu título/corpo.

## Fluxo

1. Identifique o repositório no formato `owner/name` e compare remotamente `master...develop`.
2. Se não houver commits à frente, encerre sem mutações. Se houver divergência, `develop` estiver atrás, as branches não existirem ou a consulta falhar, não crie nem edite o PR; reporte o motivo.
3. Procure PRs abertos com `base:master` e `head:develop` nesse repositório.
   - Nenhum: prepare um PR draft com título `Release: develop → master`.
   - Um: preserve o título existente, salvo se ele ainda for o título automático vazio ou genérico; sincronize apenas a descrição.
   - Mais de um: não altere nada e reporte a ambiguidade.
4. Reúna commits, arquivos alterados, estatísticas e PRs intermediários quando disponíveis. Extraia tickets somente de evidências remotas ou mensagens de commit.
5. Leia [references/description-guide.md](references/description-guide.md) e preencha [assets/pr-body-template.md](assets/pr-body-template.md). Não deixe marcadores `{{...}}`.
6. Compare o corpo normalizado com o corpo atual. Crie ou atualize somente quando houver diferença material.
7. Confirme URL, número, head SHA e ação tomada. Nunca faça merge, push, alteração de branches, aprovação ou auto-merge.

## Ferramentas e fallback

Prefira as ferramentas do conector GitHub para comparar refs, pesquisar PRs, criar PR draft e atualizar PR. Use exatamente um par `base`/`head` ao criar.

Se o conector não estiver disponível, o fallback local exige Git e GitHub CLI autenticado. Execute `scripts/collect-release-context.ps1 -RepositoryPath <caminho> -Fetch` para coletar contexto; depois use `gh pr list`, `gh pr create --draft` ou `gh pr edit`. Se autenticação, rede ou permissões falharem, pare sem simular sucesso.

## Segurança editorial

- Não invente nome de sprint, versão, ticket, título de ticket, teste executado ou impacto.
- Marque checklist com `[x]` somente quando a execução atual ou um check remoto associado ao head comprovar o item.
- Agrupe mudanças por domínio e descreva comportamento entregue, evitando lista bruta de commits ou arquivos.
- Preserve texto manual fora de `<!-- release-pr-sync:start -->` e `<!-- release-pr-sync:end -->`. Na primeira atualização de um corpo sem marcadores, substitua apenas conteúdo claramente placeholder; se houver conteúdo humano substancial, incorpore-o ou pare para evitar perda.
- Não publique atualização quando o corpo gerado for equivalente ao existente, ignorando apenas finais de linha e espaços finais.

