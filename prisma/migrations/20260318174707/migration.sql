/*
  Warnings:

  - A unique constraint covering the columns `[fabrico_id,nome]` on the table `etapas` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "etapas" ALTER COLUMN "nome" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "etapas_fabrico_id_nome_key" ON "etapas"("fabrico_id", "nome");
