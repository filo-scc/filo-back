/*
  Fix definitivo do enum Cargo com migração segura de dados
*/

-- prisma:nonTransactional

-- 1. Criar novo enum (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'cargo_new_fix'
    ) THEN
        CREATE TYPE "cargo_new_fix" AS ENUM ('ADMIN', 'PROPRIETARIO', 'GERENTE');
    END IF;
END$$;

-- 2. Remover default (evita conflito)
ALTER TABLE "public"."usuarios"
ALTER COLUMN "cargo" DROP DEFAULT;

-- 3. 🔥 CONVERTER PRA TEXT (PASSO CRÍTICO)
ALTER TABLE "public"."usuarios"
ALTER COLUMN "cargo" TYPE TEXT USING "cargo"::text;

-- 4. Corrigir dados (agora SEM erro de enum)
UPDATE "public"."usuarios"
SET "cargo" = 
  CASE
    WHEN "cargo" = 'DONO' THEN 'PROPRIETARIO'
    WHEN "cargo" = 'MEMBRO' THEN 'GERENTE'
    WHEN "cargo" = 'MANAGER' THEN 'GERENTE'
    WHEN "cargo" = 'MEMBER' THEN 'GERENTE'
    ELSE "cargo"
  END;

-- 5. Converter para novo enum (agora seguro)
ALTER TABLE "public"."usuarios"
ALTER COLUMN "cargo"
TYPE "cargo_new_fix"
USING ("cargo"::text::"cargo_new_fix");

-- 6. Renomear enum antigo (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Cargo') THEN
        ALTER TYPE "Cargo" RENAME TO "Cargo_old_fix";
    END IF;
END$$;

-- 7. Renomear novo enum
ALTER TYPE "cargo_new_fix" RENAME TO "Cargo";

-- 8. Remover enum antigo (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Cargo_old_fix') THEN
        DROP TYPE "Cargo_old_fix";
    END IF;
END$$;

-- 9. Restaurar default
ALTER TABLE "public"."usuarios"
ALTER COLUMN "cargo" SET DEFAULT 'GERENTE';