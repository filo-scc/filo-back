-- CreateTable
CREATE TABLE "FichaTecnica" (
    "id" SERIAL NOT NULL,
    "observacoes" TEXT NOT NULL,
    "concluida" BOOLEAN NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "etapa_atual_id" INTEGER NOT NULL,

    CONSTRAINT "FichaTecnica_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FichaTecnica" ADD CONSTRAINT "FichaTecnica_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaTecnica" ADD CONSTRAINT "FichaTecnica_etapa_atual_id_fkey" FOREIGN KEY ("etapa_atual_id") REFERENCES "etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
