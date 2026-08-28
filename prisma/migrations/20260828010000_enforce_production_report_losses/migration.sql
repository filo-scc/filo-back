BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE "fichas-tecnicas"
ADD CONSTRAINT "fichas_tecnicas_relatorio_producao_valido_check"
CHECK (
    "quantidade" >= 0
    AND COALESCE("defeitos_costura", 0) >= 0
    AND COALESCE("defeitos_tecido", 0) >= 0
    AND COALESCE("retiradas", 0) >= 0
    AND COALESCE("sobras", 0) >= 0
    AND COALESCE("defeitos_costura", 0)
        + COALESCE("defeitos_tecido", 0)
        + COALESCE("retiradas", 0)
        + COALESCE("sobras", 0) <= "quantidade"
) NOT VALID;

ALTER TABLE "fichas-tecnicas"
VALIDATE CONSTRAINT "fichas_tecnicas_relatorio_producao_valido_check";

COMMIT;
