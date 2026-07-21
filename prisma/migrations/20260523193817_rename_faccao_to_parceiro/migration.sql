/*
  Warnings:

  - You are about to drop the column `faccao_id` on the `enderecos` table. All the data in the column will be lost.
  - You are about to drop the `faccao_produto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `faccoes` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[parceiro_id]` on the table `enderecos` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "enderecos" DROP CONSTRAINT "enderecos_faccao_id_fkey";

-- DropForeignKey
ALTER TABLE "faccao_produto" DROP CONSTRAINT "faccao_produto_faccao_id_fkey";

-- DropForeignKey
ALTER TABLE "faccao_produto" DROP CONSTRAINT "faccao_produto_produto_id_fkey";

-- DropForeignKey
ALTER TABLE "faccoes" DROP CONSTRAINT "faccoes_fabrico_id_fkey";

-- DropIndex
DROP INDEX "enderecos_faccao_id_key";

-- AlterTable
ALTER TABLE "enderecos" DROP COLUMN "faccao_id",
ADD COLUMN     "parceiro_id" INTEGER;

-- DropTable
DROP TABLE "faccao_produto";

-- DropTable
DROP TABLE "faccoes";

-- CreateTable
CREATE TABLE "parceiros" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "responsavel" TEXT,
    "telefone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "forma_pagamento" "FormaPagamento",
    "chave_pix" TEXT,
    "banco" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "categoria" TEXT,
    "fabrico_id" INTEGER NOT NULL,

    CONSTRAINT "parceiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parceiro_produto" (
    "produto_id" INTEGER NOT NULL,
    "parceiro_id" INTEGER NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "parceiro_produto_pkey" PRIMARY KEY ("produto_id","parceiro_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parceiros_fabrico_id_nome_key" ON "parceiros"("fabrico_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "enderecos_parceiro_id_key" ON "enderecos"("parceiro_id");

-- AddForeignKey
ALTER TABLE "parceiros" ADD CONSTRAINT "parceiros_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "parceiros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parceiro_produto" ADD CONSTRAINT "parceiro_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parceiro_produto" ADD CONSTRAINT "parceiro_produto_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "parceiros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
