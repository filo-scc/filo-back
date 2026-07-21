/*
  Warnings:

  - You are about to drop the column `tipo` on the `produtos` table. All the data in the column will be lost.
  - Added the required column `tipo_produto_id` to the `produtos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "produtos" DROP COLUMN "tipo",
ADD COLUMN     "tipo_produto_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "tipo_produto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "fabrico_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipo_produto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tipo_produto_fabrico_id_idx" ON "tipo_produto"("fabrico_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_produto_fabrico_id_nome_key" ON "tipo_produto"("fabrico_id", "nome");

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_tipo_produto_id_fkey" FOREIGN KEY ("tipo_produto_id") REFERENCES "tipo_produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipo_produto" ADD CONSTRAINT "tipo_produto_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
