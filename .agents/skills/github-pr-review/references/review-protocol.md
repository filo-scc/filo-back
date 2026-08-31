# Protocolo de revisão

## Primeira passagem: descoberta

- Confirme base, head, commits e escopo real do diff.
- Leia cada arquivo alterado com contexto suficiente para entender o fluxo.
- Compare com a base quando isso distinguir regressão de comportamento preexistente.
- Siga chamadas, estados, contratos e persistência além do trecho alterado quando necessário.
- Procure testes existentes e cenários afetados.
- Registre candidatos antes de concluir que são problemas.

Um candidato precisa descrever um caminho concreto entre a mudança e o efeito observado. Não mantenha hipóteses baseadas apenas no nome de uma função, em um trecho isolado ou em preferência pessoal.

## Segunda passagem: contestação

Para cada candidato, responda:

1. O comportamento pode realmente ocorrer com os contratos e dados disponíveis?
2. O PR introduziu ou agravou o problema?
3. Há código posterior, fallback, validação ou commit do próprio PR que já o resolve?
4. O impacto no comportamento existente foi identificado de forma concreta?
5. As linhas citadas contêm a causa ou o ponto apropriado para comentar?
6. A sugestão resolve a causa sem ampliar desnecessariamente o escopo?
7. A severidade corresponde ao impacto demonstrado?

Descarte o candidato quando a evidência negar o problema, ele for apenas preexistente sem agravamento, depender de suposição não verificável ou representar somente limpeza/refatoração opcional. Registre o descarte resumidamente no documento.

## Severidade

- **Crítica:** perda ou corrupção de dados, vulnerabilidade relevante, indisponibilidade ou fluxo central inutilizável sem contorno razoável.
- **Alta:** regressão funcional relevante, persistência incorreta, integração quebrada, sucesso parcial enganoso ou falha importante em fluxo principal.
- **Média:** defeito funcional restrito, caso de borda provável ou risco concreto de compatibilidade com impacto limitado ou contorno disponível.
- **Baixa:** defeito ou risco localizado e comprovável, sem impacto significativo no fluxo principal.

Crítica e alta são potenciais bloqueios de merge. Não classifique preferência de estilo como baixa; remova-a dos apontamentos.

## Evidência e atribuição

- Cite linhas do head revisado e mantenha os trechos curtos.
- Explique separadamente o que acontece e por que acontece.
- Use um exemplo com valores, estados ou sequência de ações plausíveis.
- Em `Impacto no existente`, diga se há regressão, quebra de contrato, alteração de dados, incompatibilidade ou nenhum comprometimento comprovado.
- Quando a conclusão depender de dados, migração ou contrato não disponível, reduza a certeza e formule a verificação necessária; não apresente a hipótese como defeito confirmado.

## Verificações

Descubra os checks pelos arquivos e scripts do repositório. Rode apenas os relevantes e disponíveis. Não use comandos que reescrevam arquivos e não instale dependências sem autorização. Registre:

- comando executado;
- resultado;
- avisos relevantes;
- checks não executados e o motivo.

Uma execução bem-sucedida de lint ou build não invalida um problema funcional demonstrado. Da mesma forma, uma falha ambiental não prova regressão no PR.

## Mensagem curta

A mensagem pronta para o PR deve conter contexto suficiente para ser entendida no trecho comentado, efeito concreto e uma sugestão. Prefira duas ou três frases e encerre colaborativamente.

Exemplo de formato:

```md
Ao remover uma cor, ela deixa de aparecer na tabela, mas continua sendo somada no valor persistido. Isso pode salvar um total diferente do mostrado ao usuário. Podemos calcular o valor salvo apenas a partir das cores selecionadas?
```

