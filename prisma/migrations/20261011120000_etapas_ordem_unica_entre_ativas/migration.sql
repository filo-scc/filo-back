-- A "última etapa" de uma fábrica é a etapa ATIVA de maior ordem. Se duas etapas ativas dividissem
-- a mesma ordem, a escolha seria arbitrária e algumas fichas nunca seriam concluídas pelo cron.
-- Etapas inativas não entram na regra: podem repetir a ordem de qualquer outra.
--
-- A migration não altera dados. Se já houver ordens ativas repetidas, ela para com uma mensagem
-- clara em vez de falhar na criação do índice: corrija os dados e aplique de novo.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "etapas"
        WHERE "ativa" = true
        GROUP BY "fabrico_id", "ordem"
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Existem etapas ativas com ordem repetida no mesmo fabrico. Consulta: SELECT fabrico_id, ordem, count(*) FROM etapas WHERE ativa GROUP BY 1, 2 HAVING count(*) > 1';
    END IF;
END $$;

-- Índice único parcial (o Prisma não consegue declará-lo no schema).
CREATE UNIQUE INDEX "etapas_fabrico_id_ordem_ativa_key" ON "etapas"("fabrico_id", "ordem") WHERE "ativa" = true;
