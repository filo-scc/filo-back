/*
  Warnings:

  - The `cargo` column on the `usuarios` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Cargo" AS ENUM ('ADMIN', 'MANAGER', 'MEMBER');

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "cargo",
ADD COLUMN     "cargo" "Cargo" NOT NULL DEFAULT 'MEMBER';

-- DropEnum
DROP TYPE "Role";
