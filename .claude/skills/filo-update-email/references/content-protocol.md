# Protocolo de conteúdo

## Matriz de apuração

Antes de escrever, registre para cada mudança:

| Campo | Pergunta |
| --- | --- |
| Evidência | Qual PR, commit, documentação ou comportamento comprova a afirmação? |
| Disponibilidade | Está apenas planejada, em PR, agendada ou lançada? |
| Público | Todos, fabricação sob demanda ou produção própria? |
| Benefício | O que muda concretamente na rotina do usuário? |
| Ação | O usuário precisa atualizar, configurar ou apenas conhecer? |
| Limite | Há exceção, dependência, permissão ou rollout parcial? |

Exclua mudanças internas sem efeito observável e afirmações cuja disponibilidade não possa ser comprovada. Em caso de rollout parcial, descreva a condição ou mantenha o documento como rascunho.

## Estrutura editorial

1. Assunto direto, preferencialmente até 60 caracteres.
2. Preheader complementar, sem repetir o assunto.
3. Abertura curta explicando o valor geral da versão.
4. De três a seis novidades prioritárias, cada uma com título e benefício concreto.
5. Agrupamento por público somente quando houver diferenças entre os modos.
6. CTA único e coerente com a disponibilidade.
7. Fechamento convidando a conhecer a versão ou enviar feedback, sem pressão artificial.

## Linguagem

- Escreva em português do Brasil, com frases curtas e vocabulário da operação.
- Prefira “agora você pode” e “o FILO passa a” quando a disponibilidade estiver comprovada.
- Para rascunho ou mudança futura, use “previsto” ou “planejado” e mantenha a marca `NÃO ENVIAR`.
- Use `Ficha Técnica`, `Pedido` e `Produção` conforme a terminologia do produto.
- Não exponha nomes de tabelas, endpoints, migrations, códigos de erro ou detalhes de implementação.

## Status

- `draft`: fontes ou disponibilidade ainda incompletas; o HTML precisa exibir uma faixa `RASCUNHO — NÃO ENVIAR`.
- `scheduled`: conteúdo aprovado para uma data futura fornecida; CTA e verbos devem deixar a data clara.
- `released`: disponibilidade confirmada; não use data inferida a partir de commit ou merge sem evidência de deploy.
