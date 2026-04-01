/*
  Warnings:

  - The values [DINHEIRO] on the enum `FormaPagamento` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FormaPagamento_new" AS ENUM ('PIX', 'TED');
ALTER TABLE "faccoes" ALTER COLUMN "forma_pagamento" TYPE "FormaPagamento_new" USING ("forma_pagamento"::text::"FormaPagamento_new");
ALTER TYPE "FormaPagamento" RENAME TO "FormaPagamento_old";
ALTER TYPE "FormaPagamento_new" RENAME TO "FormaPagamento";
DROP TYPE "public"."FormaPagamento_old";
COMMIT;
