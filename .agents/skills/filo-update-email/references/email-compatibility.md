# Compatibilidade e acessibilidade de email

## Estrutura

- Use tabelas com `role="presentation"` para layout e largura máxima de 720 px.
- Mantenha estilos essenciais inline; use `<style>` apenas para responsividade e ajustes progressivos.
- Não dependa de JavaScript, formulários, iframe, vídeo, fontes externas, CSS Grid, Flexbox ou variáveis CSS.
- O conteúdo deve permanecer compreensível sem imagens, cores, cantos arredondados ou sombras.
- Use URLs absolutas HTTPS. Não use `data:`, `blob:`, caminhos locais ou imagens de rastreamento.

## Acessibilidade

- Defina `lang="pt-BR"`, `<title>`, charset e viewport.
- Use um único `h1`, hierarquia textual clara e tamanho mínimo confortável.
- Imagens informativas exigem `alt`; imagens decorativas usam `alt=""`.
- Links devem descrever o destino. Não use “clique aqui”.
- Garanta contraste legível e não use cor como único meio de indicar público ou status.

## Compatibilidade operacional

- Inclua preheader oculto e texto de preenchimento para reduzir conteúdo acidental mostrado pelo cliente de email.
- O CTA deve ser um link visível mesmo sem estilos avançados.
- Não incorpore anexos ou arquivos locais.
- Preserve placeholders de unsubscribe/preferências fornecidos pela plataforma; não invente sintaxe de merge tag.
- Se a ferramenta de envio adicionará o rodapé, registre isso como limitação na entrega.

## Validação visual

Inspecione no mínimo cerca de 720 px e 375 px quando houver navegador. Verifique overflow horizontal, legibilidade, ordem dos cartões, CTA, modo sem imagem e a presença da faixa de rascunho quando aplicável.
