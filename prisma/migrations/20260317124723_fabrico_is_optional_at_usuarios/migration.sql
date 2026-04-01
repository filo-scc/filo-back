-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_fabrico_id_fkey";

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "fabrico_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
