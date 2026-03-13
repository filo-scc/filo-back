/*
  Warnings:

  - The values [MANAGER,MEMBER] on the enum `Cargo` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Cargo_new" AS ENUM ('ADMIN', 'DONO', 'GERENTE');
ALTER TABLE "filo"."usuarios" ALTER COLUMN "cargo" DROP DEFAULT;
ALTER TABLE "usuarios" ALTER COLUMN "cargo" TYPE "Cargo_new" USING ("cargo"::text::"Cargo_new");
ALTER TYPE "Cargo" RENAME TO "Cargo_old";
ALTER TYPE "Cargo_new" RENAME TO "Cargo";
DROP TYPE "filo"."Cargo_old";
ALTER TABLE "usuarios" ALTER COLUMN "cargo" SET DEFAULT 'GERENTE';
COMMIT;

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "cargo" SET DEFAULT 'GERENTE';

-- CreateTable
CREATE TABLE "faccoes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "fabrico_id" INTEGER NOT NULL,

    CONSTRAINT "faccoes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "faccoes" ADD CONSTRAINT "faccoes_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
