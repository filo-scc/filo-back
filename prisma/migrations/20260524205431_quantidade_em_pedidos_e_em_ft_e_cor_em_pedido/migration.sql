/*
  Warnings:

  - Added the required column `cor` to the `pedidos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `pedidos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fichas-tecnicas" ADD COLUMN     "quantidade" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "cor" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "quantidade" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
