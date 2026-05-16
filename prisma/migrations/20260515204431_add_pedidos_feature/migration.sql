-- AlterTable
ALTER TABLE "fichas-tecnicas" ADD COLUMN     "pedido_id" INTEGER;

-- CreateTable
CREATE TABLE "pedidos" (
    "id" SERIAL NOT NULL,
    "finalizado" BOOLEAN NOT NULL,
    "data_prevista" TIMESTAMP(3),
    "observacoes" TEXT,
    "cliente_id" INTEGER,
    "fabrico_id" INTEGER NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fichas-tecnicas" ADD CONSTRAINT "fichas-tecnicas_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
