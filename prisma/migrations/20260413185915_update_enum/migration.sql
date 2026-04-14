/*
  Migração segura de enum Cargo com conversão de valores antigos
*/

-- AlterEnum
BEGIN;

-- 1. Criar novo enum
CREATE TYPE "Cargo_new" AS ENUM ('ADMIN', 'PROPRIETARIO', 'GERENTE');

-- 2. Remover default temporariamente
ALTER TABLE "public"."usuarios" 
ALTER COLUMN "cargo" DROP DEFAULT;

-- 3. Converter dados com mapeamento explícito
ALTER TABLE "public"."usuarios"
ALTER COLUMN "cargo"
TYPE "Cargo_new"
USING (
  CASE 
    WHEN "cargo" = 'DONO' THEN 'PROPRIETARIO'
    WHEN "cargo" = 'MEMBRO' THEN 'GERENTE'
    WHEN "cargo" = 'MANAGER' THEN 'GERENTE'
    WHEN "cargo" = 'MEMBER' THEN 'GERENTE'
    ELSE "cargo"::text
  END
)::"Cargo_new";

-- 4. Trocar enums
ALTER TYPE "Cargo" RENAME TO "Cargo_old";
ALTER TYPE "Cargo_new" RENAME TO "Cargo";

-- 5. Remover enum antigo
DROP TYPE "public"."Cargo_old";

-- 6. Restaurar default
ALTER TABLE "public"."usuarios" 
ALTER COLUMN "cargo" SET DEFAULT 'GERENTE';

COMMIT;

-- Garantia extra (Prisma costuma repetir isso)
ALTER TABLE "usuarios" 
ALTER COLUMN "cargo" SET DEFAULT 'GERENTE';