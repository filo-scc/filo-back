/*
  Warnings:

  - Made the column `nome` on table `clientes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "clientes" ALTER COLUMN "nome" SET NOT NULL;
