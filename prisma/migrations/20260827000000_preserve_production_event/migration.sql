-- Preserve the instant at which a technical sheet first became produced.
ALTER TABLE "fichas-tecnicas"
ADD COLUMN "produzida_em" TIMESTAMP(3);

-- Backfill sheets that are currently in the final active stage.
WITH "current_final_stages" AS (
    SELECT DISTINCT ON ("fabrico_id")
        "id",
        "fabrico_id"
    FROM "etapas"
    WHERE "ativa" = true
    ORDER BY "fabrico_id", "ordem" DESC, "id" DESC
),
"current_final_entries" AS (
    SELECT
        "ft"."id" AS "ficha_id",
        "fe"."data_inicio" AS "produzida_em"
    FROM "fichas-tecnicas" AS "ft"
    INNER JOIN "current_final_stages" AS "ufs"
        ON "ufs"."fabrico_id" = "ft"."fabrico_id"
        AND "ufs"."id" = "ft"."etapa_atual_id"
    INNER JOIN "fichas-etapas" AS "fe"
        ON "fe"."ficha_tecnica_id" = "ft"."id"
        AND "fe"."etapa_id" = "ufs"."id"
    WHERE "fe"."data_inicio" IS NOT NULL
)
UPDATE "fichas-tecnicas" AS "ft"
SET "produzida_em" = "entry"."produzida_em"
FROM "current_final_entries" AS "entry"
WHERE "ft"."id" = "entry"."ficha_id";

-- For already concluded sheets, the latest recorded stage entry is the best
-- historical evidence available when the former final stage is no longer final.
WITH "concluded_entries" AS (
    SELECT
        "ft"."id" AS "ficha_id",
        MAX("fe"."data_inicio") AS "produzida_em"
    FROM "fichas-tecnicas" AS "ft"
    INNER JOIN "fichas-etapas" AS "fe"
        ON "fe"."ficha_tecnica_id" = "ft"."id"
    WHERE "ft"."concluida" = true
        AND "ft"."produzida_em" IS NULL
        AND "fe"."data_inicio" IS NOT NULL
    GROUP BY "ft"."id"
)
UPDATE "fichas-tecnicas" AS "ft"
SET "produzida_em" = "entry"."produzida_em"
FROM "concluded_entries" AS "entry"
WHERE "ft"."id" = "entry"."ficha_id";

CREATE INDEX "fichas-tecnicas_fabrico_id_produzida_em_idx"
ON "fichas-tecnicas"("fabrico_id", "produzida_em");
