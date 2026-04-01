/*
  Warnings:

  - Made the column `email` on table `usuarios` required. This step will fail if there are existing NULL values in that column.
  - Made the column `senha` on table `usuarios` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "senha" SET NOT NULL;
