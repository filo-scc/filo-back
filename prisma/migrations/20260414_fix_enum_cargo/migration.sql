/*
  Fix seguro do enum Cargo com migração de dados
*/

-- NÃO usar transação (evita problema com ENUM no Postgres)
-- prisma:nonTransactional

-- 1. Criar novo enum se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'cargo_new_fix'
    ) THEN
        CREATE TYPE "cargo_new_fix" AS ENUM ('ADMIN', 'PROPRIETARIO', 'GERENTE');
    END IF;
END$$;

-- 2. Remover default temporariamente (se existir)
ALTER TABLE "public"."usuarios"
ALTER COLUMN "cargo" DROP DEFAULT;

-- 3. Atualizar dados antes de trocar tipo (ESSENCIAL)
UPDATE "public"."usuarios"
SET "cargo" = 
  CASE
    WHEN "cargo" = 'DONO' THEN 'PROPRIETARIO'
    WHEN "cargo" = 'MEMBRO' THEN 'GERENTE'
    WHEN "cargo" = 'MANAGER' THEN 'GERENTE'
    WHEN "cargo" = 'MEMBER' THEN 'GERENTE'
    ELSE "cargo"
  END;

-- 4. Alterar tipo com cast seguro
ALTER TABLE "public"."usuarios"
ALTER COLUMN "cargo"
TYPE "cargo_new_fix"
USING ("cargo"::text::"cargo_new_fix");

-- 5. Renomear enums com proteção
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Cargo') THEN
        ALTER TYPE "Cargo" RENAME TO "Cargo_old_fix";
    END IF;
END$$;

ALTER TYPE "cargo_new_fix" RENAME TO "Cargo";

-- 6. Remover enum antigo se existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Cargo_old_fix') THEN
        DROP TYPE "Cargo_old_fix";
    END IF;
END$$;

-- 7. Restaurar default
ALTER TABLE "public"."usuarios"
ALTER COLUMN "cargo" SET DEFAULT 'GERENTE';