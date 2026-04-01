/*
  Warnings:

  - The values [ACESORIO] on the enum `TipoProduto` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TipoProduto_new" AS ENUM ('VESTUARIO', 'CALCADO', 'ACESSORIO');
ALTER TABLE "produtos" ALTER COLUMN "tipo" TYPE "TipoProduto_new" USING ("tipo"::text::"TipoProduto_new");
ALTER TYPE "TipoProduto" RENAME TO "TipoProduto_old";
ALTER TYPE "TipoProduto_new" RENAME TO "TipoProduto";
DROP TYPE "public"."TipoProduto_old";
COMMIT;
