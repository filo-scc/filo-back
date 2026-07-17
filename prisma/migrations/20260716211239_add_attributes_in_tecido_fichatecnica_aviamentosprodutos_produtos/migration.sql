/*
  Warnings:

  - Added the required column `quantidade` to the `produtos_aviamentos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `custo_unitario` to the `tecidos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unidade_de_medida` to the `tecidos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fichas-tecnicas" ADD COLUMN     "numero" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "custo_operacional" DECIMAL(10,2),
ADD COLUMN     "custo_tecido" DECIMAL(10,2),
ADD COLUMN     "outros_custos" DECIMAL(10,2),
ADD COLUMN     "quantidade_tecido" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "produtos_aviamentos" ADD COLUMN     "quantidade" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "tecidos" ADD COLUMN     "custo_unitario" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "unidade_de_medida" "UnidadeDeMedida" NOT NULL;
