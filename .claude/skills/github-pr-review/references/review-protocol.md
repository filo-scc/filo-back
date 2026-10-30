# Protocolo compartilhado de revisão

## Primeira passagem: descoberta

- Fixe número, URL, base SHA, head SHA, commits e escopo real do diff.
- Leia cada arquivo alterado com contexto suficiente para seguir chamadas, estado, contrato e persistência.
- Compare com a base para distinguir regressão de comportamento preexistente.
- Procure testes existentes, consumidores e cenários afetados.
- Classifique cada área de risco como `afetada`, `não afetada` ou `limitação`, sempre com justificativa curta.
- Registre candidatos sem tratá-los antecipadamente como findings.

Um candidato precisa descrever um caminho concreto entre a mudança e o efeito. Nome de função, trecho isolado, preferência pessoal ou check verde não bastam.

## Segunda passagem: contestação

Para cada candidato, responda:

1. O comportamento pode ocorrer com os contratos e dados comprovados?
2. O PR introduziu ou agravou o problema?
3. Outro trecho, fallback, validação ou commit do PR já o resolve?
4. A localização contém a causa ou o ponto apropriado de correção?
5. O impacto, o escopo e o gatilho são concretos?
6. A severidade respeita as invariantes canônicas e o impacto demonstrado?
7. A confiança corresponde à evidência disponível?
8. A correção sugerida elimina a causa com o menor escopo seguro?
9. Há teste de regressão que falha antes e passa depois?
10. O head permaneceu o mesmo durante a análise?

Descarte o candidato quando a evidência negar o problema, ele for preexistente sem agravamento, depender de suposição material não verificável ou representar apenas limpeza opcional. Registre o descarte resumidamente.

## Roteamento de risco

Registre `afetada`, `não afetada` ou `limitação` para:

- isolamento entre fábricas;
- autenticação e autorização;
- pedidos e fichas técnicas;
- Kanban, etapas e concorrência;
- integridade, precisão e migrations;
- contrato entre frontend e backend.

Não expanda a revisão para uma auditoria total quando a área não tiver relação concreta com o PR.

## Severidade

As severidades e os níveis previstos nas invariantes canônicas prevalecem. Não reduza uma severidade normativa usando esta análise.

Para calibrar dentro da faixa permitida, documente:

- natureza: leitura, mutação, perda, indisponibilidade ou degradação;
- alcance: registro, fluxo, fábrica, múltiplas fábricas ou sistema;
- sensibilidade e relevância dos dados;
- ator, pré-condições e facilidade de acionamento;
- duração, detectabilidade e possibilidade de recuperação;
- impacto operacional, financeiro e de compatibilidade.

Referência geral:

- **Crítica:** violação classificada como crítica pelas invariantes, comprometimento de conta, perda/corrupção relevante, indisponibilidade central ou ação destrutiva sem recuperação razoável.
- **Alta:** autorização indevida relevante, persistência incorreta, quebra de fluxo principal, migration perigosa ou incompatibilidade significativa.
- **Média:** defeito restrito ou recuperável, caso de borda provável ou degradação com contorno seguro.
- **Baixa:** defeito comprovado e localizado sem impacto significativo em fluxo central.

Não use severidade baixa para estilo. Se a evidência não comprovar impacto, descarte ou registre como limitação; não rebaixe artificialmente.

## Confiança

- **Confirmada:** reproduzida ou demonstrada diretamente por contrato e caminho determinístico.
- **Alta:** caminho e pré-condições comprovados; execução não necessária ou indisponível.
- **Média:** há evidência concreta, mas falta dependência externa ou estado para confirmação completa.
- **Baixa:** faltam evidências materiais; não mantenha como finding.

Severidade mede impacto; confiança mede força da evidência.

## Contrato do finding

Cada finding deve explicitar:

- título orientado ao efeito;
- localização no head e evidência curta;
- comportamento incorreto e causa técnica;
- ator/sequência para segurança ou gatilho concreto para defeito funcional;
- impacto nos clientes e escopo afetado;
- regressão, quebra de contrato ou outro impacto no existente;
- correção mínima segura;
- teste de regressão com pré-condição, ação e resultado esperado;
- limitações e checks pendentes;
- mensagem curta, autocontida e colaborativa para o PR.

## Verificações

Descubra checks pelos scripts e instruções do repositório. Rode apenas os relevantes e não destrutivos. Registre comando, resultado, avisos e omissões justificadas.

Lint, build ou validação estrutural não invalida defeito funcional demonstrado. Falha ambiental não prova regressão. Não execute formatter, `--fix`, migration, seed ou qualquer escrita em banco compartilhado.

## Resultado sem findings

Mantenha metadados, cobertura, compatibilidade, checks, limitações e candidatos descartados. Remova blocos fictícios e conclua `Nenhum finding mantido`.
