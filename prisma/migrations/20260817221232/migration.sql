/*
  Warnings:

  - You are about to alter the column `custo_unitario` on the `aviamentos` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,4)`.

*/
-- AlterTable
ALTER TABLE "aviamentos" ALTER COLUMN "custo_unitario" SET DATA TYPE DECIMAL(10,4);

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "custo_total" DECIMAL(10,2);
