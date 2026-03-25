-- CreateTable
CREATE TABLE "cliente_produto" (
    "nome_para_cliente" TEXT NOT NULL,
    "preco_padrao" DOUBLE PRECISION NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,

    CONSTRAINT "cliente_produto_pkey" PRIMARY KEY ("produto_id","cliente_id")
);

-- AddForeignKey
ALTER TABLE "cliente_produto" ADD CONSTRAINT "cliente_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_produto" ADD CONSTRAINT "cliente_produto_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
