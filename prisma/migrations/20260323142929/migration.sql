/*
  Warnings:

  - A unique constraint covering the columns `[cliente_id]` on the table `enderecos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "enderecos" ADD COLUMN     "cliente_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "enderecos_cliente_id_key" ON "enderecos"("cliente_id");

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
