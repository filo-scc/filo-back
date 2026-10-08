# Exemplos do contrato

Os exemplos são ilustrativos e não comprovam uma versão real.

## Entrada normalizada

```text
release: FILO Update 0.8
source: PRs e release notes fornecidos pelo usuário
availability: released
release_date: 15 de outubro de 2026
cta_url: https://filo.app.br
hero_image_url: https://hirvdgkyveznasgetdvr.supabase.co/storage/v1/object/public/uploads/2/WhatsApp%20Image%202026-06-10%20at%2013.44.29.jpeg
output: email-filo-update-0.8.html
```

## Metadados esperados no HTML

```html
<!-- Subject: FILO Update 0.8: novidades para sua produção -->
<!-- Preheader: Conheça as melhorias que chegaram aos Pedidos, Produções e Fichas Técnicas. -->
<!-- Release status: released -->
<!-- Sources: PR 120; PR 121; release notes 0.8 -->
```

## Cartão para um modo específico

```html
<div aria-label="Novidade para fabricação sob demanda">
    <strong>Para quem trabalha com Pedidos</strong>
    <p>Agora você pode ...</p>
</div>
```

O email final não deve conter reticências, marcadores ou afirmações sem evidência. O exemplo demonstra forma, não conteúdo de release.
