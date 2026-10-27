-- Parceiro passa a ser ligado à etapa pelo ID (DEV-472). Até aqui o vínculo era o NOME da etapa
-- digitado em parceiros.categoria: renomear a etapa fazia o custo do parceiro sumir em silêncio.
--
-- Fase "expandir" (esta migration): acrescenta etapa_id e preenche pelo nome. A coluna categoria
-- fica sem uso no código, só como registro, e sai numa migration futura, depois que esta estiver
-- em produção e o relatório dos não casados (abaixo) estiver resolvido: é a única cópia do texto
-- dos parceiros sem etapa.
--
-- Backfill: casa categoria com etapas.nome DENTRO DO MESMO FABRICO, sem acento, sem diferença de
-- maiúsculas e com espaços colapsados (mesma regra do antigo cálculo de custo). Só casa quando há
-- exatamente uma etapa candidata; o resto fica com etapa_id nulo. É idempotente: só toca em
-- parceiros que ainda não têm etapa_id.
--
-- Relatório dos não casados (reproduzível a qualquer momento):
--   SELECT id, fabrico_id, nome, categoria FROM parceiros
--   WHERE etapa_id IS NULL AND btrim(coalesce(categoria, '')) <> '' ORDER BY fabrico_id, id;

ALTER TABLE "parceiros" ADD COLUMN "etapa_id" INTEGER;

CREATE INDEX "parceiros_etapa_id_idx" ON "parceiros"("etapa_id");

-- Excluir a etapa não exclui o parceiro: ele só perde o vínculo.
ALTER TABLE "parceiros" ADD CONSTRAINT "parceiros_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Normalização igual à que o cálculo de custo usava (ProdutoService.normalizarNome, removido neste
-- PR), sem depender da extensão unaccent. A função vive só nesta sessão e some ao final.
CREATE FUNCTION pg_temp.filo_normalizar_nome(valor text) RETURNS text AS $$
    SELECT lower(
        regexp_replace(
            regexp_replace(
                translate(
                    regexp_replace(coalesce(valor, ''), '[\u0300-\u036f]', '', 'g'),
                    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
                    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
                ),
                '\s+', ' ', 'g'
            ),
            '^ | $', '', 'g'
        )
    )
$$ LANGUAGE sql IMMUTABLE;

WITH candidatos AS (
    SELECT
        p."id" AS parceiro_id,
        e."id" AS etapa_id,
        count(*) OVER (PARTITION BY p."id") AS total
    FROM "parceiros" p
    JOIN "etapas" e
        ON e."fabrico_id" = p."fabrico_id"
        AND pg_temp.filo_normalizar_nome(e."nome") = pg_temp.filo_normalizar_nome(p."categoria")
    WHERE p."etapa_id" IS NULL
        AND pg_temp.filo_normalizar_nome(p."categoria") <> ''
)
UPDATE "parceiros" p
SET "etapa_id" = c.etapa_id
FROM candidatos c
WHERE p."id" = c.parceiro_id
    AND c.total = 1;

DO $$
DECLARE
    nao_casados integer;
BEGIN
    SELECT count(*) INTO nao_casados
    FROM "parceiros"
    WHERE "etapa_id" IS NULL AND btrim(coalesce("categoria", '')) <> '';

    RAISE NOTICE 'parceiros sem etapa após o backfill: % (consulta no cabeçalho desta migration)', nao_casados;
END $$;
