-- AlterTable
ALTER TABLE "etapas" ADD COLUMN     "icone_cinza_id" INTEGER;

-- AddForeignKey
ALTER TABLE "etapas" ADD CONSTRAINT "etapas_icone_cinza_id_fkey" FOREIGN KEY ("icone_cinza_id") REFERENCES "icones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
