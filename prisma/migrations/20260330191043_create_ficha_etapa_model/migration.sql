-- CreateTable
CREATE TABLE "fichas-etapas" (
    "id" SERIAL NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "ficha_tecnica_id" INTEGER NOT NULL,
    "etapa_id" INTEGER NOT NULL,

    CONSTRAINT "fichas-etapas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fichas-etapas" ADD CONSTRAINT "fichas-etapas_ficha_tecnica_id_fkey" FOREIGN KEY ("ficha_tecnica_id") REFERENCES "fichas-tecnicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas-etapas" ADD CONSTRAINT "fichas-etapas_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
