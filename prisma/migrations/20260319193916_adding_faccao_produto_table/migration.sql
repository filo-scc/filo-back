-- CreateTable
CREATE TABLE "faccao_produto" (
    "produto_id" INTEGER NOT NULL,
    "faccao_id" INTEGER NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "faccao_produto_pkey" PRIMARY KEY ("produto_id","faccao_id")
);

-- AddForeignKey
ALTER TABLE "faccao_produto" ADD CONSTRAINT "faccao_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faccao_produto" ADD CONSTRAINT "faccao_produto_faccao_id_fkey" FOREIGN KEY ("faccao_id") REFERENCES "faccoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
