/*
  Warnings:

  - A unique constraint covering the columns `[ficha_tecnica_id,etapa_id]` on the table `fichas-etapas` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "fichas-etapas_ficha_tecnica_id_etapa_id_key" ON "fichas-etapas"("ficha_tecnica_id", "etapa_id");
