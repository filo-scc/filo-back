-- DropForeignKey
ALTER TABLE "fichas-tecnicas" DROP CONSTRAINT "fichas-tecnicas_fabrico_id_fkey";

-- DropForeignKey
ALTER TABLE "fichas-tecnicas" DROP CONSTRAINT "fichas-tecnicas_produto_id_fkey";

-- AddForeignKey
ALTER TABLE "fichas-tecnicas" ADD CONSTRAINT "fichas-tecnicas_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas-tecnicas" ADD CONSTRAINT "fichas-tecnicas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
