/*
  Warnings:

  - Added the required column `unidade_de_medida` to the `aviamentos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `aviamentos` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UnidadeDeMedida" AS ENUM ('METRO', 'CENTIMETRO', 'GRAMA', 'QUILOGRAMA', 'UNIDADE', 'PAR');

-- AlterTable
ALTER TABLE "aviamentos" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "custo_unitario" DECIMAL(10,2),
ADD COLUMN     "unidade_de_medida" "UnidadeDeMedida" NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
