# Protocolo do piloto de qualidade das skills P0

## Controle

| Campo                          | Valor                                             |
| ------------------------------ | ------------------------------------------------- |
| Versão                         | `1.0`                                             |
| Status                         | Preparado; execução humana pendente               |
| Owner                          | Gheyson                                           |
| Revisão de qualidade/segurança | Gheyson, com Lucas de Holanda como substituto     |
| Participantes                  | Gheyson (D1), Arthur Capistrano (D2) e Érico (D3) |
| Corpus                         | `.agents/evals/**/cases.json`                     |
| Rubrica                        | `.agents/evals/SCORING.md`                        |
| Data de preparação             | 2026-08-28                                        |

## 1. Objetivo

Medir se as skills detectam riscos conhecidos, evitam falsos bloqueios, resistem a instruções não confiáveis e produzem findings verificáveis com custo e duração aceitáveis.

O piloto não autoriza publicação automática, merge, gate, alteração de código, migration ou acesso a dados reais.

## 2. Pré-condições

- skills e corpus no mesmo commit;
- `validate-corpus.mjs` e `validate-skills.mjs` aprovados;
- três participantes nomeados;
- dois revisores por resultado crítico/alto, sem autoaprovação;
- modelo/configuração registrados e estáveis durante a rodada;
- nenhuma fixture com dado real de cliente;
- local seguro para armazenar respostas sanitizadas.

## 3. Desenho da primeira rodada

### 3.1 Qualificação integral

Antes do uso em PR real, um executor e um revisor percorrem os 109 casos canônicos das sete skills P0 — a `github-pr-review` existente e as seis skills novas. Essa rodada mede cobertura básica; não vale como comparação entre desenvolvedores.

### 3.2 Piloto com os três desenvolvedores

O revisor ordena os 109 casos por skill e categoria e os distribui em round-robin com semente registrada: 37 para D1 — Gheyson, 36 para D2 — Arthur Capistrano e 36 para D3 — Érico. Assim, os três participantes exercitam todas as áreas sem expor o resultado esperado.

Para estabilidade, dois casos de calibração por skill — um positivo e um negativo sorteados pelo revisor — são repetidos pelos outros dois participantes, acrescentando 28 execuções. Total planejado: 137.

A distribuição poderá ser ajustada por impedimento, mas deve preservar equilíbrio de categorias, cobertura das sete skills e os 28 casos cruzados.

## 4. Cegamento e execução

O revisor escolhe o caso e fornece ao executor somente a saída de:

```bash
node .agents/evals/show-case.mjs <skill> <CASE-ID>
```

O bloco `expected` não deve ser mostrado antes da resposta final. O executor inicia tarefa limpa, não consulta resultados anteriores e não modifica skill/corpus durante a rodada.

## 5. Revisão e registro

1. Salvar a resposta bruta sem dados sensíveis.
2. Copiar `.agents/evals/result-template.json` para o registro da execução.
3. Revisor primário compara com `expected` e pontua pela rubrica.
4. Revisor secundário avalia findings críticos/altos e todos os desacordos.
5. Registrar aceitação, rejeição, duplicidade, duração e custo disponível.
6. Consolidar resultados por skill e por executor sem ranking punitivo de pessoas.

O objetivo é calibrar o sistema e o processo, não avaliar desempenho individual dos desenvolvedores.

## 6. Critérios de saída

Ao final, cada skill recebe um destes estados:

- **Permanece proposta:** corpus ou comportamento ainda não sustenta uso supervisionado.
- **Piloto:** rodada mínima executada, limitações conhecidas e uso exclusivamente manual/supervisionado.
- **Suspensa:** violação de segurança, prompt injection obedecida, falso bloqueio grave ou saída instável que exija correção antes de novo teste.

Promoção além de `Piloto` segue os critérios do Blueprint e exige decisão humana formal. Não há promoção automática por média.

## 7. Relatório consolidado obrigatório

- commits e configuração;
- participantes e revisores;
- casos executados, inválidos e não executados;
- recall de críticos, precisão, falsos bloqueios e findings sem evidência;
- aderência ao contrato;
- estabilidade;
- duração e custo;
- falhas de segurança/processo;
- mudanças propostas para skill ou corpus;
- decisão humana de ciclo de vida por skill;
- próxima data de revisão.
