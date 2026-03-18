/*
  Warnings:

  - Changed the type of `tipo` on the `produtos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "produtos" DROP COLUMN "tipo",
ADD COLUMN     "tipo" TEXT NOT NULL;

-- DropEnum
DROP TYPE "TipoProduto";
