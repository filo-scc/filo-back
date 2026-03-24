/*
  Warnings:

  - Added the required column `fabrico_id` to the `FichaTecnica` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FichaTecnica" DROP CONSTRAINT "FichaTecnica_etapa_atual_id_fkey";

-- AlterTable
ALTER TABLE "FichaTecnica" ADD COLUMN     "fabrico_id" INTEGER NOT NULL,
ALTER COLUMN "observacoes" DROP NOT NULL,
ALTER COLUMN "etapa_atual_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "FichaTecnica" ADD CONSTRAINT "FichaTecnica_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaTecnica" ADD CONSTRAINT "FichaTecnica_etapa_atual_id_fkey" FOREIGN KEY ("etapa_atual_id") REFERENCES "etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
