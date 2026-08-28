# Revisão do PR {{PR_NUMBER}} - sugestões

PR: {{PR_URL}}  
Título: {{PR_TITLE}}  
Base: `{{BASE_REF}}` (`{{BASE_SHA}}`)  
Branch: `{{HEAD_REF}}`  
Head revisado: `{{HEAD_SHA}}`

Escopo: {{REVIEW_SCOPE}}

## Resumo

{{KEPT_FINDINGS_SUMMARY_OR_NO_FINDINGS}}

## Impacto no que já existe

{{OVERALL_COMPATIBILITY_AND_REGRESSION_ASSESSMENT}}

## Verificações executadas

```bash
{{COMMANDS_RUN}}
```

{{CHECK_RESULTS_AND_LIMITATIONS}}

## 1. {{ACTION_ORIENTED_FINDING_TITLE}}

Severidade: {{CRITICA_ALTA_MEDIA_OU_BAIXA}}.

Onde:

- `{{FILE_PATH}}:{{START_LINE}}-{{END_LINE}}`

Trecho:

```{{LANGUAGE}}
{{MINIMAL_RELEVANT_CODE}}
```

Problema: {{OBSERVED_INCORRECT_BEHAVIOR}}

Por que ocorre: {{TECHNICAL_CAUSE}}

Impacto no existente: {{REGRESSION_COMPATIBILITY_OR_DATA_IMPACT}}

Exemplo: {{CONCRETE_SCENARIO}}

Sugestão: {{PROPORTIONAL_RESOLUTION_ACTION}}

Mensagem curta para o PR:

```md
{{SHORT_SELF_CONTAINED_MESSAGE_ENDING_WITH_A_CONCRETE_SUGGESTION}}
```

## Pontos reavaliados e não mantidos como correção

- {{DISCARDED_CANDIDATE_AND_EVIDENCE_OR_NONE}}

## Validação manual recomendada antes do merge

- {{MANUAL_SCENARIO_OR_NONE}}
