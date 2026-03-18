/*
  Warnings:

  - Added the required column `fabrico_id` to the `produtos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "fabrico_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
