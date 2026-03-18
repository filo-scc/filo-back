/*
  Warnings:

  - A unique constraint covering the columns `[fabrico_id,nome]` on the table `produtos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "produtos_fabrico_id_nome_key" ON "produtos"("fabrico_id", "nome");
