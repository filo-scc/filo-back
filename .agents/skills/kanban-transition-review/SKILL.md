---
name: kanban-transition-review
description: Auditar transições de fichas no Kanban do FILO, incluindo ordem, histórico, produzida_em, conclusão após 72 horas, idempotência e concorrência. Use quando mudar quadro, etapas, ficha-etapa, transferência ou job de conclusão; não use para alterações visuais sem efeito de estado.
---

# Kanban Transition Review

Verifique a máquina de estados e prove que ficha, histórico e efeitos auxiliares permanecem coerentes sob falha, retry e concorrência.

## Governança

- Estado: `Proposta`, candidata a piloto supervisionado.
- Owner: Gheyson.
- Substitutos: Arthur Capistrano para implementação e Lucas de Holanda para qualidade/segurança.
- Evals: `.agents/evals/kanban-transition-review/cases.json`.
- Revisar até 2026-11-30 ou após mudança do fluxo de produção/job.

## Contrato vigente

- A ficha pode avançar para qualquer etapa ativa posterior e pode pular etapas.
- A ficha nunca pode retornar a etapa anterior.
- Não existe conclusão manual.
- Entrar na última etapa registra `produzida_em` atomicamente.
- Após 72 horas, o job marca `concluida` e retira a ficha do Kanban.
- `produzida_em` depende de PR separado até integração e verificação; não presuma que já existe no código atual.

## Procedimento

1. Aplique `INV-KAN-*`, invariantes tenant e o `AGENTS.md`.
2. Leia [references/protocol.md](references/protocol.md).
3. Reconstrua estado inicial, origem esperada, destino, ator, fábrica, histórico e efeitos auxiliares.
4. Verifique caminho feliz, salto, retorno, retry, falha intermediária, duas transferências e disputa com o job.
5. Conteste findings contra transações, constraints, estado esperado e comportamento preexistente.

## Entrega e falha segura

Produza matriz de transições, linha do tempo, análise de atomicidade/concorrência, findings completos, descartes e limitações. Não mova fichas reais, não execute jobs e não altere código ou produção sem autorização.

Sem origem persistida, ordem das etapas ou contrato do job, não conclua que a transição é válida: registre a evidência ausente.
