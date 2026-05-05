/*
  Warnings:

  - Added the required column `grade_versao_id` to the `fichas-tecnicas` table without a default value. This is not possible if the table is not empty.

*/

-- AlterTable
ALTER TABLE "fichas-tecnicas" ADD COLUMN     "grade_versao_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "grade_versao_id" INTEGER;

-- CreateTable
CREATE TABLE "tamanhos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "ordem_global" INTEGER NOT NULL,

    CONSTRAINT "tamanhos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_itens" (
    "id" SERIAL NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "tamanho_id" INTEGER NOT NULL,
    "posicao" INTEGER NOT NULL,

    CONSTRAINT "grade_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_versoes" (
    "id" SERIAL NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "versao" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_versoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_versao_itens" (
    "id" SERIAL NOT NULL,
    "grade_versao_id" INTEGER NOT NULL,
    "tamanho_id" INTEGER NOT NULL,
    "posicao" INTEGER NOT NULL,

    CONSTRAINT "grade_versao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fabrico_grades" (
    "id" SERIAL NOT NULL,
    "fabrico_id" INTEGER NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fabrico_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cores" (
    "id" SERIAL NOT NULL,
    "fabrico_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo_hex" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_tecnica_itens" (
    "id" SERIAL NOT NULL,
    "ficha_tecnica_id" INTEGER NOT NULL,
    "cor_id" INTEGER NOT NULL,
    "grade_versao_item_id" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ficha_tecnica_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tamanhos_codigo_key" ON "tamanhos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tamanhos_ordem_global_key" ON "tamanhos"("ordem_global");

-- CreateIndex
CREATE UNIQUE INDEX "grades_nome_key" ON "grades"("nome");

-- CreateIndex
CREATE INDEX "grade_itens_grade_id_idx" ON "grade_itens"("grade_id");

-- CreateIndex
CREATE INDEX "grade_itens_tamanho_id_idx" ON "grade_itens"("tamanho_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade_itens_grade_id_tamanho_id_key" ON "grade_itens"("grade_id", "tamanho_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade_itens_grade_id_posicao_key" ON "grade_itens"("grade_id", "posicao");

-- CreateIndex
CREATE INDEX "grade_versoes_grade_id_idx" ON "grade_versoes"("grade_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade_versoes_grade_id_versao_key" ON "grade_versoes"("grade_id", "versao");

-- CreateIndex
CREATE INDEX "grade_versao_itens_grade_versao_id_idx" ON "grade_versao_itens"("grade_versao_id");

-- CreateIndex
CREATE INDEX "grade_versao_itens_tamanho_id_idx" ON "grade_versao_itens"("tamanho_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade_versao_itens_grade_versao_id_tamanho_id_key" ON "grade_versao_itens"("grade_versao_id", "tamanho_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade_versao_itens_grade_versao_id_posicao_key" ON "grade_versao_itens"("grade_versao_id", "posicao");

-- CreateIndex
CREATE INDEX "fabrico_grades_fabrico_id_idx" ON "fabrico_grades"("fabrico_id");

-- CreateIndex
CREATE INDEX "fabrico_grades_grade_id_idx" ON "fabrico_grades"("grade_id");

-- CreateIndex
CREATE UNIQUE INDEX "fabrico_grades_fabrico_id_grade_id_key" ON "fabrico_grades"("fabrico_id", "grade_id");

-- CreateIndex
CREATE INDEX "cores_fabrico_id_idx" ON "cores"("fabrico_id");

-- CreateIndex
CREATE UNIQUE INDEX "cores_fabrico_id_nome_key" ON "cores"("fabrico_id", "nome");

-- CreateIndex
CREATE INDEX "ficha_tecnica_itens_ficha_tecnica_id_idx" ON "ficha_tecnica_itens"("ficha_tecnica_id");

-- CreateIndex
CREATE INDEX "ficha_tecnica_itens_cor_id_idx" ON "ficha_tecnica_itens"("cor_id");

-- CreateIndex
CREATE INDEX "ficha_tecnica_itens_grade_versao_item_id_idx" ON "ficha_tecnica_itens"("grade_versao_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "ficha_tecnica_itens_ficha_tecnica_id_cor_id_grade_versao_it_key" ON "ficha_tecnica_itens"("ficha_tecnica_id", "cor_id", "grade_versao_item_id");

-- CreateIndex
CREATE INDEX "produtos_fabrico_id_idx" ON "produtos"("fabrico_id");

-- CreateIndex
CREATE INDEX "produtos_grade_versao_id_idx" ON "produtos"("grade_versao_id");

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_grade_versao_id_fkey" FOREIGN KEY ("grade_versao_id") REFERENCES "grade_versoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas-tecnicas" ADD CONSTRAINT "fichas-tecnicas_grade_versao_id_fkey" FOREIGN KEY ("grade_versao_id") REFERENCES "grade_versoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_itens" ADD CONSTRAINT "grade_itens_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_itens" ADD CONSTRAINT "grade_itens_tamanho_id_fkey" FOREIGN KEY ("tamanho_id") REFERENCES "tamanhos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_versoes" ADD CONSTRAINT "grade_versoes_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_versao_itens" ADD CONSTRAINT "grade_versao_itens_grade_versao_id_fkey" FOREIGN KEY ("grade_versao_id") REFERENCES "grade_versoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_versao_itens" ADD CONSTRAINT "grade_versao_itens_tamanho_id_fkey" FOREIGN KEY ("tamanho_id") REFERENCES "tamanhos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabrico_grades" ADD CONSTRAINT "fabrico_grades_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabrico_grades" ADD CONSTRAINT "fabrico_grades_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cores" ADD CONSTRAINT "cores_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tecnica_itens" ADD CONSTRAINT "ficha_tecnica_itens_ficha_tecnica_id_fkey" FOREIGN KEY ("ficha_tecnica_id") REFERENCES "fichas-tecnicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tecnica_itens" ADD CONSTRAINT "ficha_tecnica_itens_cor_id_fkey" FOREIGN KEY ("cor_id") REFERENCES "cores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tecnica_itens" ADD CONSTRAINT "ficha_tecnica_itens_grade_versao_item_id_fkey" FOREIGN KEY ("grade_versao_item_id") REFERENCES "grade_versao_itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
