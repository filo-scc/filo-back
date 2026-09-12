# Revisão do PR {{PR_NUMBER}} — {{REPOSITORY}}

PR: {{PR_URL}}

Título: {{PR_TITLE}}

Base: `{{BASE_REF}}` (`{{BASE_SHA}}`)

Branch: `{{HEAD_REF}}`

Head revisado: `{{HEAD_SHA}}`

Modo de inspeção: `{{INSPECTION_MODE}}`

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

## Verificações

```bash
{{COMMANDS_RUN_OR_NONE}}
```

{{CHECK_RESULTS_AND_OMISSIONS}}

## Limitações globais

- {{GLOBAL_LIMITATION_OR_NONE}}

<!-- Use este bloco para findings críticos/altos, segurança, dados ou deploy. Remova a instrução e blocos não usados. -->
## {{INDEX}}. {{EFFECT_ORIENTED_FINDING_TITLE}}

Severidade: {{SEVERITY}}.

Confiança: {{CONFIDENCE}}.

Invariantes: {{INVARIANTS_OR_NONE}}.

Onde: `{{FILE_PATH}}:{{START_LINE}}-{{END_LINE}}`

Evidência:

```{{LANGUAGE}}
{{MINIMAL_RELEVANT_CODE}}
```

Problema: {{OBSERVED_INCORRECT_BEHAVIOR}}

Causa técnica: {{TECHNICAL_CAUSE}}

Exploração ou gatilho: {{ACTOR_PRECONDITIONS_AND_SEQUENCE_OR_FUNCTIONAL_TRIGGER}}

Impacto nos clientes: {{CUSTOMER_IMPACT}}

Escopo afetado: {{AFFECTED_FACTORIES_ROLES_RECORDS_VERSIONS_OR_FLOWS}}

Impacto no existente: {{REGRESSION_COMPATIBILITY_OR_DATA_IMPACT}}

Correção mínima segura: {{MINIMUM_SAFE_FIX}}

Teste de regressão: {{TEST_PRECONDITIONS_ACTION_AND_EXPECTED_RESULT}}

Limitações do finding: {{MISSING_EVIDENCE_UNRUN_CHECKS_OR_NONE}}

Mensagem curta para o PR:

```md
{{SHORT_SELF_CONTAINED_COLLABORATIVE_MESSAGE}}
```

<!-- Use este bloco compacto somente para findings médios/baixos. Todos os campos continuam obrigatórios. -->
## {{INDEX}}. {{EFFECT_ORIENTED_FINDING_TITLE}}

**Classificação:** {{SEVERITY}}; confiança {{CONFIDENCE}}; invariantes {{INVARIANTS_OR_NONE}}.

**Onde e evidência:** `{{FILE_PATH}}:{{START_LINE}}-{{END_LINE}}` — {{MINIMAL_EVIDENCE_AND_CONNECTION}}

**Efeito e causa:** {{OBSERVED_BEHAVIOR_AND_TECHNICAL_CAUSE}}

**Gatilho/exploração:** {{ACTOR_SEQUENCE_OR_FUNCTIONAL_TRIGGER}}

**Impacto e escopo:** {{CUSTOMER_EXISTING_BEHAVIOR_AND_AFFECTED_SCOPE}}

**Correção e regressão:** {{MINIMUM_SAFE_FIX_AND_FAILS_BEFORE_PASSES_AFTER_TEST}}

**Limitações:** {{MISSING_EVIDENCE_UNRUN_CHECKS_OR_NONE}}

Mensagem curta para o PR:

```md
{{SHORT_SELF_CONTAINED_COLLABORATIVE_MESSAGE}}
```

## Pontos reavaliados e não mantidos como correção

- {{DISCARDED_CANDIDATE_AND_EVIDENCE_OR_NONE}}

## Validação manual recomendada antes do merge

- {{MANUAL_SCENARIO_OR_NONE}}
