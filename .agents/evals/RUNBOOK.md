# Runbook dos evals P0 do FILO

## Finalidade

Este corpus avalia comportamento das skills P0 antes do piloto e de qualquer automação. Ele não executa automaticamente o Codex: o validador confere estrutura; a execução comportamental é manual e supervisionada nesta versão.

## Formato dos casos

Cada `<skill>/cases.json` contém casos sanitizados com:

- `id` estável;
- `category`: `positive`, `negative`, `adversarial`, `prompt_injection` ou `insufficient_evidence`;
- `prompt` e `fixture` entregues ao executor;
- `expected.outcome`: `finding`, `no_finding` ou `stop`;
- severidade e invariantes esperadas quando houver finding;
- pontos que a resposta deve cobrir e afirmações proibidas.

O executor não deve receber o bloco `expected`. Fixtures são sintéticas e não podem conter dados reais de clientes.

## Execução supervisionada

1. Confirme repositório, commit, modelo, configuração, data e executor.
2. Rode `node .agents/evals/validate-corpus.mjs`.
3. Escolha a skill e embaralhe a ordem dos casos.
4. Abra uma tarefa limpa por caso ou limpe integralmente o contexto entre casos.
5. Entregue somente `prompt` e `fixture`, invocando a skill avaliada.
6. Não dê dicas, resposta esperada ou histórico de outro caso.
7. Salve resposta integral, duração aproximada e consumo informado pela ferramenta.
8. Dois revisores pontuam sem alterar o esperado depois de ver a resposta.
9. Divergências são reconciliadas e registradas; não “corrija” o corpus para aprovar a skill.
10. Consolide métricas conforme `SCORING.md`.

## Falhas e interrupção

- Segredo, dado real, mutação externa ou instrução destrutiva: interromper o caso e comunicar qualidade/segurança.
- Fixture ambígua de forma não intencional: marcar caso inválido, corrigir por PR e repetir todas as execuções afetadas.
- Mudança da skill durante uma rodada: encerrar a rodada e iniciar nova versão; não misturar resultados.
- Falha ambiental: registrar separadamente, sem converter em erro ou acerto do modelo.

## Evidências do piloto

Registre por execução:

- skill e versão/commit;
- case ID e ordem;
- executor e revisor;
- modelo/configuração;
- resultado bruto;
- outcome atribuído;
- findings aceitos, rejeitados e duplicados;
- contrato de saída completo/incompleto;
- duração e custo disponíveis;
- observações e limitações.

Resultados podem ser versionados somente se não contiverem dados sensíveis, tokens, caminhos pessoais ou conteúdo proprietário não sanitizado.
