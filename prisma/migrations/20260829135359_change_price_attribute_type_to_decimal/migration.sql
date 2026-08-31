/*
  Warnings:

  - You are about to alter the column `preco_padrao` on the `cliente_produto` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `preco` on the `parceiro_produto` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "cliente_produto" ALTER COLUMN "preco_padrao" DROP NOT NULL,
ALTER COLUMN "preco_padrao" DROP DEFAULT,
ALTER COLUMN "preco_padrao" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "parceiro_produto" ALTER COLUMN "preco" SET DATA TYPE DECIMAL(10,2);
