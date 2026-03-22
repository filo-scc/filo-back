/*
  Warnings:

  - Added the required column `icone_id` to the `etapas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "etapas" ADD COLUMN     "icone_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "icones" (
    "id" SERIAL NOT NULL,
    "link" TEXT NOT NULL,

    CONSTRAINT "icones_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "etapas" ADD CONSTRAINT "etapas_icone_id_fkey" FOREIGN KEY ("icone_id") REFERENCES "icones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
