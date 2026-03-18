/*
  Warnings:

  - A unique constraint covering the columns `[fabrico_id,nome]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fabrico_id,nome]` on the table `faccoes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `enderecos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "enderecos" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clientes_fabrico_id_nome_key" ON "clientes"("fabrico_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "faccoes_fabrico_id_nome_key" ON "faccoes"("fabrico_id", "nome");
