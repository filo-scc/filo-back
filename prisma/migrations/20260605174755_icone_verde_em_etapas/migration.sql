-- AlterTable
ALTER TABLE "etapas" ADD COLUMN     "icone_verde_id" INTEGER;

-- AddForeignKey
ALTER TABLE "etapas" ADD CONSTRAINT "etapas_icone_verde_id_fkey" FOREIGN KEY ("icone_verde_id") REFERENCES "icones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
