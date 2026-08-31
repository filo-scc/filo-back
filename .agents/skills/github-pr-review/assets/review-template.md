# Revisão do PR {{PR_NUMBER}} - findings

PR: {{PR_URL}}  
Título: {{PR_TITLE}}  
Base: `{{BASE_REF}}` (`{{BASE_SHA}}`)  
Branch: `{{HEAD_REF}}`  
Head revisado: `{{HEAD_SHA}}`

Escopo: {{REVIEW_SCOPE}}

## Resumo executivo

{{KEPT_FINDINGS_SUMMARY_OR_NO_FINDINGS}}

## Cobertura de risco

- Isolamento entre fábricas: {{TENANT_ISOLATION_COVERAGE}}
- Autenticação e autorização: {{AUTHORIZATION_COVERAGE}}
- Pedidos e fichas técnicas: {{ORDERS_AND_TECHNICAL_SHEETS_COVERAGE}}
- Kanban, etapas e concorrência: {{KANBAN_AND_CONCURRENCY_COVERAGE}}
- Integridade, precisão e migrations: {{DATA_AND_MIGRATIONS_COVERAGE}}
- Contrato entre frontend e backend: {{API_CONTRACT_COVERAGE}}

## Impacto no comportamento existente

{{OVERALL_COMPATIBILITY_AND_REGRESSION_ASSESSMENT}}

## Verificações executadas

```bash
{{COMMANDS_RUN}}
```

{{CHECK_RESULTS}}

## Limitações globais

- {{GLOBAL_LIMITATION_OR_NONE}}

## 1. {{EFFECT_ORIENTED_FINDING_TITLE}}

Severidade: {{CRITICA_ALTA_MEDIA_OU_BAIXA}}.

Confiança: {{CONFIRMADA_ALTA_OU_MEDIA}}.

Onde:

- `{{FILE_PATH}}:{{START_LINE}}-{{END_LINE}}`

Evidência:

```{{LANGUAGE}}
{{MINIMAL_RELEVANT_CODE}}
```

{{EVIDENCE_CONNECTING_CODE_TO_BEHAVIOR}}

Problema: {{OBSERVED_INCORRECT_BEHAVIOR}}

Causa técnica: {{TECHNICAL_CAUSE}}

Exploração possível: {{ACTOR_PRECONDITIONS_AND_SEQUENCE_OR_NOT_APPLICABLE_WITH_TRIGGER}}

Impacto nos clientes: {{CUSTOMER_IMPACT}}

Escopo afetado: {{AFFECTED_FACTORIES_ROLES_RECORDS_VERSIONS_OR_FLOWS}}

Impacto no existente: {{REGRESSION_COMPATIBILITY_OR_DATA_IMPACT}}

Exemplo concreto: {{CONCRETE_SCENARIO}}

Correção mínima segura: {{MINIMUM_SAFE_FIX}}

Teste de regressão: {{TEST_PRECONDITIONS_ACTION_AND_EXPECTED_RESULT}}

Limitações do finding: {{MISSING_EVIDENCE_UNRUN_CHECKS_OR_NONE}}

Mensagem curta para o PR:

```md
{{SHORT_SELF_CONTAINED_MESSAGE_ENDING_WITH_A_CONCRETE_SUGGESTION}}
```

## Pontos reavaliados e não mantidos como correção

- {{DISCARDED_CANDIDATE_AND_EVIDENCE_OR_NONE}}

## Validação manual recomendada antes do merge

- {{MANUAL_SCENARIO_OR_NONE}}
