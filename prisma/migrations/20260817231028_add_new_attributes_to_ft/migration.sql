-- AlterTable
ALTER TABLE "fichas-tecnicas" ADD COLUMN     "defeitos_costura" INTEGER DEFAULT 0,
ADD COLUMN     "defeitos_tecido" INTEGER DEFAULT 0,
ADD COLUMN     "retiradas" INTEGER DEFAULT 0,
ADD COLUMN     "sobras" INTEGER DEFAULT 0;
