-- DropForeignKey
ALTER TABLE "faccao_produto" DROP CONSTRAINT "faccao_produto_faccao_id_fkey";

-- DropForeignKey
ALTER TABLE "faccao_produto" DROP CONSTRAINT "faccao_produto_produto_id_fkey";

-- AddForeignKey
ALTER TABLE "faccao_produto" ADD CONSTRAINT "faccao_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faccao_produto" ADD CONSTRAINT "faccao_produto_faccao_id_fkey" FOREIGN KEY ("faccao_id") REFERENCES "faccoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
