# Protocolo de isolamento entre fábricas

## 1. Modele a autorização

Registre:

- ator e papel;
- fábrica derivada da identidade;
- capacidade global explícita, quando o ator for `ADMIN`;
- recurso alvo e raiz de posse;
- IDs controlados pelo cliente;
- ponto de enforcement no backend e constraint relevante.

Para posse derivada, percorra todas as pontas. Exemplos: ficha↔etapa, ficha↔pedido, ficha↔cor, ficha↔parceiro, produto↔cliente e produto↔aviamento.

## 2. Cubra as superfícies

Classifique como `segura`, `vulnerável`, `não afetada` ou `não comprovada`:

- listar e buscar;
- ler por ID e includes aninhados;
- criar e conectar relações;
- atualizar, inclusive troca de chave estrangeira;
- excluir e operações batch;
- relatórios, exports, uploads e storage;
- jobs, filas e rotinas administrativas;
- cache, logout, troca de sessão e respostas atrasadas no frontend.

Um método que infere a fábrica do recurso alvo, mas não a compara com a fábrica do ator, continua vulnerável.

## 3. Execute a matriz negativa

Use fábricas sintéticas A e B:

1. caminho legítimo de A sobre A;
2. usuário tenant de A com ID raiz de B;
3. usuário tenant de A com relação filha de B;
4. usuário tenant de A em lista/filtro declarado como B;
5. ID inexistente versus ID de B, verificando enumeração;
6. `ADMIN` em endpoint global explícito;
7. `PROPRIETARIO` ou `GERENTE` tentando o mesmo endpoint global.

Quando não puder executar, demonstre o caminho no código e ajuste a confiança. Não alegue exploração confirmada sem evidência suficiente.

## 4. Conteste candidatos

Descarte o candidato se uma validação posterior usa a fábrica do ator, se a operação é global e exige `ADMIN`, se o recurso é catálogo compartilhado por contrato ou se o problema é preexistente e não foi agravado pelo diff em uma revisão de PR.

Não descarte apenas porque a interface não oferece o ID, porque IDs parecem difíceis de adivinhar ou porque um controller costuma chamar o service de forma segura.

## 5. Saída mínima

Inclua:

```md
## Contexto de autorização

- Ator/papel:
- Origem da fábrica autorizada:
- Recursos e posse:

## Matriz A/B

| Operação | A→A | A→B | Evidência |

## Findings mantidos

### Título orientado ao efeito

Severidade:
Confiança:
Invariantes:
Localização e evidência:
Problema e causa:
Exploração possível:
Impacto nos clientes:
Escopo afetado:
Impacto no existente:
Correção mínima segura:
Teste de regressão:
Limitações:

## Candidatos descartados

## Verificações e limitações
```
