-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'PIX');

-- AlterTable
ALTER TABLE "faccoes" ADD COLUMN     "forma_pagamento" "FormaPagamento";
