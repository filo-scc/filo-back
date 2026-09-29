---
name: filo-update-email
description: Criar um documento HTML de email para comunicar novidades verificadas do FILO a todos os usuários, cobrindo fabricação sob demanda e produção própria. Use para anúncios de versão ou atualização; não acesse destinatários, envie mensagens nem invente disponibilidade.
---

# FILO Update Email

Crie um único HTML de email, em português do Brasil, pronto para revisão e compatível com os dois modos de produção do FILO. A skill gera o artefato; não consulta usuários, não envia email e não configura campanhas.

Use os parâmetros, permissões e o contrato de saída de [manifest.yaml](manifest.yaml). A skill é ativa e informativa. Veja entradas e saídas completas em [references/contract-examples.md](references/contract-examples.md).

## Público e terminologia

O público é composto por todos os usuários dos dois modos:

- fabricação sob demanda: use `Pedido/Pedidos`;
- produção própria: use `Produção/Produções`.

Organize o conteúdo para todos, fabricação sob demanda e produção própria; omita grupos vazios. Mudanças sem disponibilidade comprovada ficam em rascunho `NÃO ENVIAR`.

## Procedimento

1. Aplique o `AGENTS.md`, valide a entrada conforme o manifest e preserve arquivos existentes.
2. Leia [references/content-protocol.md](references/content-protocol.md) e monte a matriz mudança × evidência × disponibilidade × público × benefício.
3. Consulte código ou o outro repositório somente quando necessário para comprovar uma afirmação. Não inclua detalhe interno, vulnerabilidade, dado de cliente ou informação não autorizada.
4. Escreva assunto, preheader, abertura, cartões de novidades, chamada para ação e rodapé usando [assets/email-template.html](assets/email-template.html) e os fragmentos de [assets/email-components.html](assets/email-components.html).
5. Leia [references/email-compatibility.md](references/email-compatibility.md), remova todos os marcadores e mantenha CSS essencial inline.
6. Execute [scripts/validate-email-html.mjs](scripts/validate-email-html.mjs) e corrija todos os erros.
7. Quando houver navegador disponível, inspecione o HTML em largura desktop e móvel. Validação visual não comprova veracidade das novidades.

## Entrega

Siga as seções do manifest. Entregue um HTML autocontido em marcação e estilos, com imagens HTTPS opcionais, e informe caminho, assunto, preheader, fontes, status, validações e limitações.

## Limites editoriais e operacionais

- Explique benefício e ação do usuário; não reproduza changelog técnico bruto.
- Não prometa ganho de velocidade, segurança, precisão ou disponibilidade sem evidência.
- Não exponha detalhes de correção de segurança que facilitem exploração.
- Não use urgência artificial, depoimento inventado ou afirmação absoluta.
- Não determine sozinho se o email é transacional ou promocional. Preserve o rodapé obrigatório da ferramenta de envio e registre quando ele ainda precisar ser inserido.
- Criar o HTML não autoriza enviar, importar destinatários, acessar produção ou publicar assets.
