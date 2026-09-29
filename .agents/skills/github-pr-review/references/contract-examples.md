# Exemplos do contrato

Os valores abaixo são ilustrativos e não afirmam o estado de um PR real.

## Entrada por URL

```text
Use $github-pr-review para revisar https://github.com/filo-scc/filo-front/pull/82.
```

Entrada normalizada:

```text
pr: 82
repository: filo-front
inspection: isolated
output: <raiz-do-filo-front>/review-pr-82.md
```

## Entrada pelo modo legado

```text
Use $github-pr-review com gh pr checkout 62.
```

Entrada normalizada após confirmar o repositório atual:

```text
pr: 62
repository: filo-back
inspection: current
output: <raiz-do-filo-back>/review-pr-62.md
```

## Saída compacta ilustrativa

```md
# Revisão do PR 82 — filo-front

PR: https://github.com/filo-scc/filo-front/pull/82
Base: `develop` (`base-sha-verificado`)
Head revisado: `head-sha-verificado`
Modo de inspeção: `isolated`

## Resumo executivo

Um finding médio mantido. O restante do diff não apresentou regressão comprovada.

## 1. Resposta antiga pode substituir o estado mais recente do modal

**Classificação:** Média; confiança Alta; invariantes `INV-API-004`.
**Onde e evidência:** `src/pages/Exemplo.jsx:40-48` — a resposta é aplicada sem validar a requisição ativa.
**Efeito e causa:** uma busca anterior pode sobrescrever a seleção atual porque não há cancelamento ou versão da requisição.
**Gatilho/exploração:** abrir A, selecionar B antes da resposta de A e receber as respostas na ordem inversa.
**Impacto e escopo:** o modal pode mostrar dados obsoletos aos usuários desse fluxo; é regressão introduzida pelo PR.
**Correção e regressão:** cancelar/versionar a busca e testar resolução A depois de B, mantendo B renderizado.
**Limitações:** o cenário não foi executado em navegador nesta revisão.

Mensagem curta para o PR:

> A resposta da seleção anterior ainda pode atualizar o modal depois da busca atual. Isso pode mostrar dados obsoletos quando as respostas chegam fora de ordem. Podemos cancelar ou versionar a requisição e cobrir a resolução invertida?
```

O relatório real também deve conter cobertura de risco, checks, limitações globais, candidatos descartados e validação manual conforme o template.
