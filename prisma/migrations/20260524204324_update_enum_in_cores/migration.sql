/*
  Warnings:

  - The values [LISA] on the enum `TipoCor` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TipoCor_new" AS ENUM ('COR', 'ESTAMPA');
ALTER TABLE "cores" ALTER COLUMN "tipo" TYPE "TipoCor_new" USING ("tipo"::text::"TipoCor_new");
ALTER TYPE "TipoCor" RENAME TO "TipoCor_old";
ALTER TYPE "TipoCor_new" RENAME TO "TipoCor";
DROP TYPE "public"."TipoCor_old";
COMMIT;
