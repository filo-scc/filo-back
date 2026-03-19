/*
  Warnings:

  - Added the required column `updated_at` to the `cliente_produto` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cliente_produto" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "preco_padrao" DROP NOT NULL,
ALTER COLUMN "preco_padrao" SET DEFAULT 0;
