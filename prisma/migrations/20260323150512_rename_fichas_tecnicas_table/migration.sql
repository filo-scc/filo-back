/*
  Warnings:

  - You are about to drop the `FichaTecnica` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FichaTecnica" DROP CONSTRAINT "FichaTecnica_etapa_atual_id_fkey";

-- DropForeignKey
ALTER TABLE "FichaTecnica" DROP CONSTRAINT "FichaTecnica_fabrico_id_fkey";

-- DropForeignKey
ALTER TABLE "FichaTecnica" DROP CONSTRAINT "FichaTecnica_produto_id_fkey";

-- DropTable
DROP TABLE "FichaTecnica";

-- CreateTable
CREATE TABLE "fichas-tecnicas" (
    "id" SERIAL NOT NULL,
    "observacoes" TEXT,
    "concluida" BOOLEAN NOT NULL,
    "fabrico_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "etapa_atual_id" INTEGER,

    CONSTRAINT "fichas-tecnicas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fichas-tecnicas" ADD CONSTRAINT "fichas-tecnicas_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas-tecnicas" ADD CONSTRAINT "fichas-tecnicas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas-tecnicas" ADD CONSTRAINT "fichas-tecnicas_etapa_atual_id_fkey" FOREIGN KEY ("etapa_atual_id") REFERENCES "etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
