-- CreateTable
CREATE TABLE "ficha_tecnica_parceiro" (
    "operacao" TEXT,
    "ficha_id" INTEGER NOT NULL,
    "parceiro_id" INTEGER NOT NULL,

    CONSTRAINT "ficha_tecnica_parceiro_pkey" PRIMARY KEY ("ficha_id","parceiro_id")
);

-- AddForeignKey
ALTER TABLE "ficha_tecnica_parceiro" ADD CONSTRAINT "ficha_tecnica_parceiro_ficha_id_fkey" FOREIGN KEY ("ficha_id") REFERENCES "fichas-tecnicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tecnica_parceiro" ADD CONSTRAINT "ficha_tecnica_parceiro_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "parceiros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
