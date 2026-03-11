-- CreateTable
CREATE TABLE "fabricos" (
    "id" SERIAL NOT NULL,
    "foto_de_perfil" TEXT,
    "cnpj" VARCHAR(14),
    "razao_social" TEXT,
    "nome_fantasia" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fabricos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fabricos_cnpj_key" ON "fabricos"("cnpj");
