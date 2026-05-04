-- CreateEnum
CREATE TYPE "Cargo" AS ENUM ('ADMIN', 'PROPRIETARIO', 'GERENTE');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'TED');

-- CreateTable
CREATE TABLE "fabricos" (
    "id" SERIAL NOT NULL,
    "foto_de_perfil" TEXT,
    "cnpj" VARCHAR(14),
    "razao_social" TEXT,
    "nome_fantasia" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fabricos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT,
    "senha" TEXT NOT NULL,
    "foto_de_perfil" TEXT,
    "cargo" "Cargo" NOT NULL DEFAULT 'GERENTE',
    "refresh_token_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "fabrico_id" INTEGER,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faccoes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "responsavel" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "forma_pagamento" "FormaPagamento",
    "chave_pix" TEXT,
    "banco" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "fabrico_id" INTEGER NOT NULL,

    CONSTRAINT "faccoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "responsavel" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "fabrico_id" INTEGER NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "icone_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "fabrico_id" INTEGER NOT NULL,

    CONSTRAINT "etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enderecos" (
    "id" SERIAL NOT NULL,
    "rua" TEXT,
    "numero" TEXT,
    "bairro" TEXT,
    "complemento" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "usuario_id" INTEGER,
    "faccao_id" INTEGER,
    "cliente_id" INTEGER,

    CONSTRAINT "enderecos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" SERIAL NOT NULL,
    "foto" TEXT,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "fabrico_id" INTEGER NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icones" (
    "id" SERIAL NOT NULL,
    "link" TEXT,

    CONSTRAINT "icones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichas-tecnicas" (
    "id" SERIAL NOT NULL,
    "observacoes" TEXT,
    "concluida" BOOLEAN NOT NULL,
    "fabrico_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "etapa_atual_id" INTEGER,

    CONSTRAINT "fichas-tecnicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_produto" (
    "nome_para_cliente" TEXT NOT NULL,
    "preco_padrao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,

    CONSTRAINT "cliente_produto_pkey" PRIMARY KEY ("produto_id","cliente_id")
);

-- CreateTable
CREATE TABLE "faccao_produto" (
    "produto_id" INTEGER NOT NULL,
    "faccao_id" INTEGER NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "faccao_produto_pkey" PRIMARY KEY ("produto_id","faccao_id")
);

-- CreateTable
CREATE TABLE "fichas-etapas" (
    "id" SERIAL NOT NULL,
    "data_inicio" TIMESTAMP(3),
    "data_fim" TIMESTAMP(3),
    "observacoes" TEXT,
    "ficha_tecnica_id" INTEGER NOT NULL,
    "etapa_id" INTEGER NOT NULL,

    CONSTRAINT "fichas-etapas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fabricos_cnpj_key" ON "fabricos"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "faccoes_fabrico_id_nome_key" ON "faccoes"("fabrico_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpj_key" ON "clientes"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_fabrico_id_nome_key" ON "clientes"("fabrico_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_fabrico_id_nome_key" ON "etapas"("fabrico_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "enderecos_usuario_id_key" ON "enderecos"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "enderecos_faccao_id_key" ON "enderecos"("faccao_id");

-- CreateIndex
CREATE UNIQUE INDEX "enderecos_cliente_id_key" ON "enderecos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_fabrico_id_nome_key" ON "produtos"("fabrico_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "fichas-etapas_ficha_tecnica_id_etapa_id_key" ON "fichas-etapas"("ficha_tecnica_id", "etapa_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faccoes" ADD CONSTRAINT "faccoes_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas" ADD CONSTRAINT "etapas_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas" ADD CONSTRAINT "etapas_icone_id_fkey" FOREIGN KEY ("icone_id") REFERENCES "icones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_faccao_id_fkey" FOREIGN KEY ("faccao_id") REFERENCES "faccoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas-tecnicas" ADD CONSTRAINT "fichas-tecnicas_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas-tecnicas" ADD CONSTRAINT "fichas-tecnicas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas-tecnicas" ADD CONSTRAINT "fichas-tecnicas_etapa_atual_id_fkey" FOREIGN KEY ("etapa_atual_id") REFERENCES "etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_produto" ADD CONSTRAINT "cliente_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_produto" ADD CONSTRAINT "cliente_produto_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faccao_produto" ADD CONSTRAINT "faccao_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faccao_produto" ADD CONSTRAINT "faccao_produto_faccao_id_fkey" FOREIGN KEY ("faccao_id") REFERENCES "faccoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas-etapas" ADD CONSTRAINT "fichas-etapas_ficha_tecnica_id_fkey" FOREIGN KEY ("ficha_tecnica_id") REFERENCES "fichas-tecnicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas-etapas" ADD CONSTRAINT "fichas-etapas_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
