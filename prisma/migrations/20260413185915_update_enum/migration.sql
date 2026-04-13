/*
  Warnings:

  - The values [DONO,MEMBRO] on the enum `Cargo` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Cargo_new" AS ENUM ('ADMIN', 'PROPRIETARIO', 'GERENTE');
ALTER TABLE "public"."usuarios" ALTER COLUMN "cargo" DROP DEFAULT;
ALTER TABLE "usuarios" ALTER COLUMN "cargo" TYPE "Cargo_new" USING ("cargo"::text::"Cargo_new");
ALTER TYPE "Cargo" RENAME TO "Cargo_old";
ALTER TYPE "Cargo_new" RENAME TO "Cargo";
DROP TYPE "public"."Cargo_old";
ALTER TABLE "usuarios" ALTER COLUMN "cargo" SET DEFAULT 'GERENTE';
COMMIT;

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "cargo" SET DEFAULT 'GERENTE';
