---
name: filo-update-email
description: Criar um documento HTML de email para comunicar novidades verificadas do FILO a todos os usuários, cobrindo fabricação sob demanda e produção própria. Use para anúncios de versão ou atualização; não acesse destinatários, envie mensagens nem invente disponibilidade.
---

# FILO Update Email

Crie um único HTML de email, em português do Brasil, pronto para revisão e compatível com os dois modos de produção do FILO. A skill gera o artefato; não consulta usuários, não envia email e não configura campanhas.

## Contrato de entrada

| Parâmetro | Obrigatório | Regra |
| --- | --- | --- |
| `release` | Sim | Nome ou versão, por exemplo `FILO Update 0.8` |
| `source` | Sim | Release notes, PRs, commits, diff ou lista de mudanças com evidência verificável |
| `availability` | Não | `draft` por padrão; `scheduled` ou `released` somente com data/status informado ou comprovado |
| `release_date` | Condicional | Exigida para `scheduled`/`released`; não invente uma data |
| `cta_url` | Não | `https://filo.app.br` por padrão |
| `hero_image_url` | Não | `https://hirvdgkyveznasgetdvr.supabase.co/storage/v1/object/public/uploads/2/WhatsApp%20Image%202026-06-10%20at%2013.44.29.jpeg` por padrão |
| `feedback_url` | Não | Inclua apenas quando fornecida ou já canônica no contexto autorizado |
| `output` | Não | `email-filo-update-<versao>.html` na raiz do repositório atual |

Aceite linguagem natural, sem exigir flags. Exemplo:

```text
Use $filo-update-email para criar o email do FILO Update 0.8, lançado em 15 de outubro de 2026, a partir destes PRs: [...].
```

Se as mudanças não estiverem comprovadamente disponíveis, gere um rascunho identificado como `NÃO ENVIAR` no HTML e na entrega. Não converta PR aberto, código local ou planejamento em novidade já lançada.

## Público e terminologia

O público é composto por todos os usuários dos dois modos:

- fabricação sob demanda: use `Pedido/Pedidos`;
- produção própria: use `Produção/Produções`.

Organize o conteúdo em novidades para todos, para fabricação sob demanda e para produção própria. Omita grupos vazios. Quando uma mudança afetar apenas um modo, identifique isso explicitamente; não faça parecer que ela está disponível para todos.

## Procedimento

1. Aplique o `AGENTS.md` ativo e preserve arquivos locais existentes.
2. Leia [references/content-protocol.md](references/content-protocol.md), verifique as fontes e monte a matriz mudança × evidência × disponibilidade × público × benefício.
3. Consulte código ou o outro repositório somente quando necessário para comprovar uma afirmação. Não inclua detalhe interno, vulnerabilidade, dado de cliente ou informação não autorizada.
4. Escreva assunto, preheader, abertura, cartões de novidades, chamada para ação e rodapé usando [assets/email-template.html](assets/email-template.html) e os fragmentos de [assets/email-components.html](assets/email-components.html).
5. Leia [references/email-compatibility.md](references/email-compatibility.md), substitua todos os marcadores e mantenha CSS essencial inline.
6. Execute `node scripts/validate-email-html.mjs <arquivo-gerado>` e corrija todos os erros.
7. Quando houver navegador disponível, inspecione o HTML em largura desktop e móvel. Validação visual não comprova veracidade das novidades.

## Contrato de saída

Entregue exatamente um arquivo HTML autocontido quanto a marcação e estilos. Imagens podem ser externas somente por HTTPS. O arquivo deve conter:

- comentários iniciais `Subject`, `Preheader`, `Release status` e `Sources`;
- `lang="pt-BR"`, título, preheader oculto e conteúdo legível sem imagens;
- identificação da versão e, quando comprovada, data de disponibilidade;
- novidades agrupadas pelo público aplicável;
- CTA principal;
- rodapé de preferências/cancelamento apenas quando fornecido pela plataforma de envio ou pelo usuário;
- nenhum marcador `{{...}}`, script, formulário, pixel de rastreamento, segredo ou dado pessoal.

Na resposta ao usuário, informe caminho, assunto, preheader, fontes usadas, status (`rascunho`, `agendado` ou `lançado`), validações executadas e limitações.

Para exemplos preenchidos de entrada e saída, leia [references/contract-examples.md](references/contract-examples.md).

## Limites editoriais e operacionais

- Explique benefício e ação do usuário; não reproduza changelog técnico bruto.
- Não prometa ganho de velocidade, segurança, precisão ou disponibilidade sem evidência.
- Não exponha detalhes de correção de segurança que facilitem exploração.
- Não use urgência artificial, depoimento inventado ou afirmação absoluta.
- Não determine sozinho se o email é transacional ou promocional. Preserve o rodapé obrigatório da ferramenta de envio e registre quando ele ainda precisar ser inserido.
- Criar o HTML não autoriza enviar, importar destinatários, acessar produção ou publicar assets.
