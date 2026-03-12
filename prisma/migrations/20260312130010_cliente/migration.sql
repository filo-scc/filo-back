-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT,
    "cnpj" TEXT,
    "telefone" TEXT,
    "responsavel" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "fabrico_id" INTEGER NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpj_key" ON "clientes"("cnpj");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
