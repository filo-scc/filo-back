-- AlterEnum
ALTER TYPE "FormaPagamento" ADD VALUE 'TED';

-- AlterTable
ALTER TABLE "faccoes" ADD COLUMN     "agencia" TEXT,
ADD COLUMN     "banco" TEXT,
ADD COLUMN     "chave_pix" TEXT,
ADD COLUMN     "conta" TEXT;
