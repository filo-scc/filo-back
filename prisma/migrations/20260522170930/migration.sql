/*
  Warnings:

  - A unique constraint covering the columns `[fabrico_id,numero]` on the table `pedidos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "numero" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_fabrico_id_numero_key" ON "pedidos"("fabrico_id", "numero");
