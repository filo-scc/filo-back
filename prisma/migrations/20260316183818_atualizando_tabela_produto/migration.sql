/*
  Warnings:

  - You are about to drop the column `preco` on the `produtos` table. All the data in the column will be lost.
  - Changed the type of `tipo` on the `produtos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TipoProduto" AS ENUM ('VESTUARIO', 'CALCADO', 'ACESORIO');

-- AlterTable
ALTER TABLE "produtos" DROP COLUMN "preco",
ADD COLUMN     "foto" TEXT,
DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoProduto" NOT NULL;
