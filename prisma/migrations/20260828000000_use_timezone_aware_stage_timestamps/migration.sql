-- Existing DateTime values were written as UTC instants into timestamp columns.
-- Attach that timezone explicitly without changing the represented instants.
ALTER TABLE "fichas-etapas"
ALTER COLUMN "data_inicio" TYPE TIMESTAMPTZ(3)
USING "data_inicio" AT TIME ZONE 'UTC',
ALTER COLUMN "data_fim" TYPE TIMESTAMPTZ(3)
USING "data_fim" AT TIME ZONE 'UTC';

ALTER TABLE "fichas-tecnicas"
ALTER COLUMN "produzida_em" TYPE TIMESTAMPTZ(3)
USING "produzida_em" AT TIME ZONE 'UTC';
