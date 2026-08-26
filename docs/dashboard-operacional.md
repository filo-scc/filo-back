# Dashboard operacional

Este documento define o contrato funcional dos indicadores operacionais da Home. Os cálculos são sempre realizados no backend e usam exclusivamente o `fabrico_id` do usuário autenticado.

## Conceitos

### Ficha produzida

Uma ficha técnica passa a integrar os indicadores no instante em que entra na última etapa ativa da fábrica. A data oficial do evento é `FichaEtapa.data_inicio` dessa etapa. A ficha pode continuar visível no Kanban por 72 horas sem deixar de ser considerada operacionalmente concluída.

### Peças e perdas

- Produção bruta: `FichaTecnica.quantidade`.
- Perdas: `defeitos_costura + defeitos_tecido + retiradas + sobras`.
- Produção aproveitada: `produção bruta - perdas`.
- Campos de perda ausentes ou nulos valem zero.
- Todos os campos devem ser inteiros não negativos.
- A soma das perdas não pode ultrapassar a quantidade da ficha.

O gráfico oferece três apresentações dos mesmos valores:

- **Produção:** produção bruta em verde.
- **Produção/Perdas:** barra empilhada com produção aproveitada em verde e perdas em vermelho; a altura total é a produção bruta.
- **Perdas:** perdas em vermelho.

### Pedido ou produção em andamento

Os cards contam registros de `Pedido`, enquanto o gráfico contabiliza fichas técnicas individualmente.

Um pedido/produção:

- sem fichas é desconsiderado;
- está operacionalmente concluído quando todas as fichas estão concluídas ou já se encontram na última etapa ativa;
- está em andamento quando ao menos uma ficha ainda não concluída está antes da última etapa;
- parcialmente concluído permanece em andamento e é contado uma única vez.

O campo `Pedido.finalizado` não é autoridade para esses cards.

### Pedido ou produção em atraso

Está em atraso quando está em andamento, possui `data_prevista` e essa data é anterior ao início do dia atual. Na própria data prevista ainda não está atrasado. Sem data prevista nunca está atrasado.

### Terminologia

- Fabricação sob demanda: **Pedido/Pedidos**.
- Produção própria: **Produção/Produções**.

## Tempo e intervalos

- Fuso oficial: `America/Recife`.
- Semanas começam na segunda-feira e terminam no domingo.
- Todos os limites são calculados nesse fuso e devolvidos em ISO 8601.
- `generatedAt` representa o instante em que a resposta foi calculada.
- Intervalos sem produção são devolvidos explicitamente com zero.

### Média semanal

Considera a semana atual e as três semanas-calendário anteriores. Soma a produção bruta e divide sempre por quatro, incluindo semanas sem produção. O resultado usa arredondamento comercial para inteiro.

### Série temporal

O parâmetro `periodo` aceita:

| Valor | Intervalos devolvidos |
| --- | --- |
| `semanal` | Semana atual e seis anteriores |
| `mensal` | Mês atual e seis anteriores |
| `trimestral` | Trimestre atual e seis anteriores |
| `anual` | Ano atual e seis anteriores |

## Endpoints

### `GET /dashboard/resumo-operacional`

Não recebe `fabrico_id`.

```json
{
  "weeklyAverageProducedPieces": 125,
  "inProgressCount": 5,
  "overdueCount": 1,
  "period": {
    "startAt": "2026-08-03T03:00:00.000Z",
    "endAt": "2026-08-31T03:00:00.000Z",
    "calendarWeeks": 4
  },
  "generatedAt": "2026-08-25T15:00:00.000Z",
  "timezone": "America/Recife",
  "hasData": true,
  "manufacturingMode": "ON_DEMAND",
  "terminology": {
    "entitySingular": "Pedido",
    "entityPlural": "Pedidos",
    "inProgressLabel": "Pedidos em andamento",
    "overdueLabel": "Pedidos em atraso"
  }
}
```

### `GET /dashboard/serie-producao?periodo=semanal&quantidade=7`

Não recebe `fabrico_id`. `quantidade` define quantos intervalos mais recentes serão retornados,
aceita valores de 1 a 24 e usa 7 quando omitida. Isso permite que a interface adapte a série à
largura disponível sem descartar dados no frontend.

```json
{
  "period": "semanal",
  "timezone": "America/Recife",
  "range": {
    "startAt": "2026-07-13T03:00:00.000Z",
    "endAt": "2026-08-31T03:00:00.000Z"
  },
  "generatedAt": "2026-08-25T15:00:00.000Z",
  "hasData": true,
  "data": [
    {
      "key": "week-2026-07-13",
      "label": "13–19 Jul",
      "startAt": "2026-07-13T03:00:00.000Z",
      "endAt": "2026-07-20T03:00:00.000Z",
      "production": 100,
      "losses": 15,
      "netProduction": 85
    }
  ]
}
```

## Ausência de dados e isolamento

- Fábrica válida sem pedidos ou fichas recebe HTTP 200, a quantidade solicitada de intervalos
  zerados e `hasData: false`.
- Toda consulta aplica `fabrico_id` vindo do JWT.
- Um identificador de fábrica nunca é aceito por parâmetro, query string ou corpo nesses endpoints.
- Usuário sem fábrica recebe HTTP 403.
