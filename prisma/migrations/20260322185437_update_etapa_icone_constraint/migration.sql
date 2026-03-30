-- DropForeignKey
ALTER TABLE "etapas" DROP CONSTRAINT "etapas_icone_id_fkey";

-- AlterTable
ALTER TABLE "etapas" ALTER COLUMN "icone_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "etapas" ADD CONSTRAINT "etapas_icone_id_fkey" FOREIGN KEY ("icone_id") REFERENCES "icones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
