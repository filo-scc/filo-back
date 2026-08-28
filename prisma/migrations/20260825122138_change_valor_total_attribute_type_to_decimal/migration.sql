/*
  Warnings:

  - You are about to alter the column `valor_total` on the `pedidos` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "pedidos" ALTER COLUMN "valor_total" SET DATA TYPE DECIMAL(10,2);
