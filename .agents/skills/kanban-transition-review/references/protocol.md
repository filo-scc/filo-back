# Protocolo de transições do Kanban

## 1. Máquina de estados

Monte a matriz:

| Estado atual | Destino | Ordem relativa | Ativa | Resultado esperado | Enforcement |
| ------------ | ------- | -------------- | ----- | ------------------ | ----------- |

Inclua avanço de uma etapa, salto para etapa posterior, mesma etapa, retorno, etapa inativa, etapa de outra fábrica, última etapa e ficha já concluída.

## 2. Operação atômica

Uma transferência segura recebe no backend:

- ficha e fábrica autorizada;
- origem esperada ou versão;
- destino;
- ator;
- chave idempotente quando retry for possível;
- dados auxiliares estritamente necessários.

Na mesma transação, valide estado/ordem, encerre origem, crie/inicie destino, atualize `etapa_atual_id` e registre `produzida_em` ao entrar na última etapa. Custos, parceiros, perdas e relatórios devem integrar a transação ou possuir compensação explícita e observável.

Sequência de chamadas coordenada apenas pelo frontend não é atômica.

## 3. Concorrência e job

Simule:

1. retry após timeout;
2. duas transferências com a mesma origem;
3. duas transferências para destinos diferentes;
4. transferência manual enquanto o job seleciona candidatos;
5. duas instâncias do job;
6. execução antes, no instante e depois de 72 horas.

O update deve condicionar o estado esperado ou usar lock/versão. Trava em memória protege apenas uma instância.

## 4. Coerência temporal

- `data_inicio <= data_fim`;
- no máximo uma etapa aberta no fluxo linear;
- `produzida_em` coincide semanticamente com entrada confirmada na última etapa;
- `concluida` só ocorre após a janela e remove a ficha das consultas do quadro;
- timezone e relógio devem ser consistentes e testáveis.

## 5. Saída

Cada finding usa o contrato completo do FILO e cita `INV-KAN-*` afetada. Informe se o risco causa histórico divergente, cartão em coluna errada, custo parcial, conclusão prematura ou perda de atualização. A correção mínima deve restaurar a invariante sem redesenhar o fluxo inteiro.
