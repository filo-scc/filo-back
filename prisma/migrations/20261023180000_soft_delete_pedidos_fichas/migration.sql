BEGIN;

ALTER TABLE "pedidos" ADD COLUMN "delete_at" TIMESTAMPTZ(3);
ALTER TABLE "fichas-tecnicas" ADD COLUMN "delete_at" TIMESTAMPTZ(3);

COMMIT;
