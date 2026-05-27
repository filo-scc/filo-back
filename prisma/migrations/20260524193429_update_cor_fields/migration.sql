/*
  Warnings:

  - Added the required column `tipo` to the `cores` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoCor" AS ENUM ('LISA', 'ESTAMPA');

-- AlterTable
ALTER TABLE "cores" ADD COLUMN     "foto" TEXT,
ADD COLUMN     "tipo" "TipoCor" NOT NULL;
