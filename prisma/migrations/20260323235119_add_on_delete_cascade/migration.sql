/*
  Warnings:

  - Made the column `preco_padrao` on table `cliente_produto` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "cliente_produto" DROP CONSTRAINT "cliente_produto_cliente_id_fkey";

-- DropForeignKey
ALTER TABLE "cliente_produto" DROP CONSTRAINT "cliente_produto_produto_id_fkey";

-- AlterTable
ALTER TABLE "cliente_produto" ALTER COLUMN "preco_padrao" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "cliente_produto" ADD CONSTRAINT "cliente_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_produto" ADD CONSTRAINT "cliente_produto_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
