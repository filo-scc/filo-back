-- Corrige números de ficha duplicados no mesmo fabrico, preservando o registro mais antigo.
WITH duplicados AS (
    SELECT
        id,
        fabrico_id,
        ROW_NUMBER() OVER (PARTITION BY fabrico_id, numero ORDER BY id) AS rn
    FROM "fichas-tecnicas"
),
max_por_fabrico AS (
    SELECT fabrico_id, COALESCE(MAX(numero), 0) AS max_numero
    FROM "fichas-tecnicas"
    GROUP BY fabrico_id
),
novos_numeros AS (
    SELECT
        d.id,
        m.max_numero + ROW_NUMBER() OVER (PARTITION BY d.fabrico_id ORDER BY d.id) AS novo_numero
    FROM duplicados d
    JOIN max_por_fabrico m ON m.fabrico_id = d.fabrico_id
    WHERE d.rn > 1
)
UPDATE "fichas-tecnicas" f
SET numero = n.novo_numero
FROM novos_numeros n
WHERE f.id = n.id;

CREATE UNIQUE INDEX "fichas-tecnicas_fabrico_id_numero_key" ON "fichas-tecnicas"("fabrico_id", "numero");

ALTER TABLE "pedidos" ADD COLUMN "idempotency_key" VARCHAR(128);

CREATE UNIQUE INDEX "pedidos_fabrico_id_idempotency_key_key" ON "pedidos"("fabrico_id", "idempotency_key");
