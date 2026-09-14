---
name: kanban-transition-review
description: Auditar transições de fichas no Kanban do FILO, incluindo ordem, histórico, produzida_em, conclusão após 72 horas, idempotência e concorrência. Use quando mudar quadro, etapas, ficha-etapa, transferência ou job de conclusão; não use para alterações visuais sem efeito de estado.
---

# Kanban Transition Review

Verifique a máquina de estados e prove que ficha, histórico e efeitos auxiliares permanecem coerentes sob falha, retry e concorrência.

Use os parâmetros, permissões e o contrato de saída de [manifest.yaml](manifest.yaml). A skill é ativa e informativa; não altera fichas nem executa jobs.

## Contrato vigente

- A ficha pode avançar para qualquer etapa ativa posterior e pode pular etapas.
- A ficha nunca pode retornar a etapa anterior.
- Não existe conclusão manual.
- Entrar na última etapa registra `produzida_em` atomicamente.
- Após 72 horas, o job marca `concluida` e retira a ficha do Kanban.
- `produzida_em` depende de PR separado até integração e verificação; não presuma que já existe no código atual.

## Procedimento

1. Aplique `AGENTS.md`, `INV-KAN-*` e invariantes tenant; valide a entrada.
2. Leia [references/protocol.md](references/protocol.md).
3. Reconstrua estado inicial, origem esperada, destino, ator, fábrica, histórico e efeitos auxiliares.
4. Verifique caminho feliz, salto, retorno, retry, falha intermediária, duas transferências e disputa com o job.
5. Conteste findings contra transações, constraints, estado esperado e comportamento preexistente.

## Entrega

Siga as seções do manifest. Sem origem persistida, ordem das etapas ou contrato do job, não conclua que a transição é válida: registre a evidência ausente.
