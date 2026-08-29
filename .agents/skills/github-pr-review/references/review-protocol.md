# Protocolo de revisão

## Primeira passagem: descoberta

- Confirme base, head, commits e escopo real do diff.
- Leia cada arquivo alterado com contexto suficiente para entender o fluxo.
- Compare com a base quando isso distinguir regressão de comportamento preexistente.
- Siga chamadas, estados, contratos e persistência além do trecho alterado quando necessário.
- Procure testes existentes e cenários afetados.
- Classifique as áreas críticas como afetadas, não afetadas ou não verificáveis.
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
8. A confiança corresponde à força da evidência e às limitações?
9. A exploração ou sequência de acionamento foi descrita sem especulação?
10. O impacto nos clientes e o escopo afetado são concretos?
11. A correção proposta é a mínima que elimina a causa com segurança?
12. Há um teste de regressão capaz de falhar antes e passar depois?

Descarte o candidato quando a evidência negar o problema, ele for apenas preexistente sem agravamento, depender de suposição não verificável ou representar somente limpeza/refatoração opcional. Registre o descarte resumidamente no documento.

## Roteamento de risco

Determine a cobertura a partir do diff e do código relacionado. Para cada área abaixo, registre `afetada`, `não afetada` ou `limitação`, com uma justificativa curta:

- isolamento entre fábricas;
- autenticação e autorização;
- pedidos e fichas técnicas;
- Kanban, etapas e concorrência;
- integridade, precisão e migrations;
- contrato entre frontend e backend.

Quando afetada, verifique no mínimo:

- **Isolamento:** origem da fábrica, queries por ID, relações aninhadas, listas, uploads, jobs e tentativa cruzada entre duas fábricas.
- **Autorização:** ator, papel, ação, recurso e validação no backend; ocultação no frontend não comprova segurança.
- **Pedidos e fichas:** atomicidade, itens adicionados/removidos, totais, batch, repetição e sucesso parcial.
- **Kanban:** origem, destino, pré-condições, idempotência, duas operações concorrentes e recuperação de falha.
- **Dados e migrations:** tipo, nulabilidade, precisão, constraint, backfill, compatibilidade, ordem de deploy e rollback.
- **Contrato:** campos, tipos, enums, erros, estados, consumidores e convivência entre versões.

Não expanda a revisão para uma auditoria total do produto quando a área não tiver relação concreta com o PR.

## Severidade

- **Crítica:** vazamento entre fábricas, corrupção ou perda relevante de dados, comprometimento de conta, indisponibilidade central ou ação destrutiva sem recuperação razoável.
- **Alta:** autorização indevida relevante, persistência incorreta, quebra de fluxo principal, migration perigosa ou integração incompatível com impacto significativo.
- **Média:** defeito funcional restrito, caso de borda provável, inconsistência recuperável ou degradação com contorno disponível.
- **Baixa:** problema comprovado e localizado, sem impacto significativo em fluxo central.

Crítica e alta são potenciais bloqueios de merge. Não classifique preferência de estilo como baixa; remova-a dos apontamentos.

## Confiança

- **Confirmada:** reproduzida por teste/execução ou demonstrada diretamente por contrato e caminho determinístico.
- **Alta:** caminho e pré-condições estão comprovados no código; a execução não foi necessária ou possível.
- **Média:** evidência concreta sustenta o risco, mas uma dependência externa ou estado não disponível impede confirmação completa.
- **Baixa:** faltam evidências materiais. Não mantenha como finding; mova para limitações ou candidatos descartados e descreva como verificar.

Severidade mede impacto; confiança mede força da evidência. Não reduza a severidade para compensar baixa confiança.

## Contrato do finding

Para cada finding mantido:

- **Título:** descreva o efeito, não apenas o componente.
- **Localização:** cite linhas do head que contêm a causa ou o ponto apropriado de correção.
- **Evidência:** mantenha o trecho curto e conecte código/contrato/execução ao comportamento.
- **Problema e causa:** separe o que acontece de por que acontece.
- **Exploração possível:** para segurança, informe ator, pré-condições e sequência; para defeito funcional, use `Não aplicável` e descreva o gatilho concreto.
- **Impacto nos clientes:** indique confidencialidade, dados, operação, disponibilidade, finanças ou experiência; não use impacto genérico.
- **Escopo afetado:** informe fábricas, perfis, registros, versões ou fluxos conhecidos; declare quando não puder quantificar.
- **Impacto no existente:** identifique regressão, quebra de contrato, alteração de dados, incompatibilidade ou ausência de comprometimento comprovado.
- **Correção mínima segura:** elimine a causa sem exigir refatoração adjacente desnecessária.
- **Teste de regressão:** descreva um caso que falha antes e passa depois, incluindo pré-condição e resultado esperado.
- **Limitações:** registre evidências ausentes, checks não executados e dependências da conclusão.

Quando a conclusão depender de dado, migration, ambiente ou contrato indisponível, ajuste a confiança e formule a verificação necessária; não apresente hipótese como fato.

## Verificações

Descubra os checks pelos arquivos e scripts do repositório. Rode apenas os relevantes e disponíveis. Não use comandos que reescrevam arquivos e não instale dependências sem autorização. Registre:

- comando executado;
- resultado;
- avisos relevantes;
- checks não executados e o motivo.

Uma execução bem-sucedida de lint ou build não invalida um problema funcional demonstrado. Da mesma forma, uma falha ambiental não prova regressão no PR.

Não execute formatter, lint com `--fix` ou outro comando que reescreva arquivos em uma revisão somente leitura.

## Mensagem curta

A mensagem pronta para o PR deve conter contexto suficiente para ser entendida no trecho comentado, efeito concreto e uma sugestão. Prefira duas ou três frases e encerre colaborativamente.

Exemplo de formato:

```md
Ao remover uma cor, ela deixa de aparecer na tabela, mas continua sendo somada no valor persistido. Isso pode salvar um total diferente do mostrado ao usuário. Podemos calcular o valor salvo apenas a partir das cores selecionadas?
```

## Resultado sem findings

Se nenhum candidato sobreviver, mantenha metadados, cobertura de risco, checks, limitações e candidatos descartados. Não preserve blocos fictícios e conclua com `Nenhum finding mantido`.
