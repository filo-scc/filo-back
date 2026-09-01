-- CreateEnum
CREATE TYPE "CategoriaNotificacao" AS ENUM ('OPERACIONAL', 'FINANCEIRA', 'INSIGHT', 'SISTEMA');

-- CreateEnum
CREATE TYPE "SeveridadeNotificacao" AS ENUM ('INFO', 'SUCESSO', 'ALERTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "FonteNotificacao" AS ENUM ('SISTEMA', 'REGRA', 'ANALYTICS', 'MODELO_PREDITIVO', 'MANUAL');

-- CreateEnum
CREATE TYPE "CanalNotificacao" AS ENUM ('IN_APP', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "StatusEntregaNotificacao" AS ENUM ('PENDENTE', 'ENVIADA', 'ENTREGUE', 'FALHOU', 'CANCELADA');

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" SERIAL NOT NULL,
    "fabrico_id" INTEGER NOT NULL,
    "tipo" VARCHAR(100) NOT NULL,
    "categoria" "CategoriaNotificacao" NOT NULL,
    "severidade" "SeveridadeNotificacao" NOT NULL,
    "fonte" "FonteNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "metadados" JSONB,
    "entidade_tipo" VARCHAR(100),
    "entidade_id" INTEGER,
    "acao_url" TEXT,
    "chave_deduplicacao" VARCHAR(255),
    "ocorreu_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes_destinatarios" (
    "id" SERIAL NOT NULL,
    "notificacao_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "lida_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_destinatarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes_entregas" (
    "id" SERIAL NOT NULL,
    "notificacao_destinatario_id" INTEGER NOT NULL,
    "canal" "CanalNotificacao" NOT NULL,
    "status" "StatusEntregaNotificacao" NOT NULL DEFAULT 'PENDENTE',
    "agendada_em" TIMESTAMP(3),
    "enviada_em" TIMESTAMP(3),
    "entregue_em" TIMESTAMP(3),
    "falha_em" TIMESTAMP(3),
    "erro" TEXT,
    "provider_message_id" TEXT,

    CONSTRAINT "notificacoes_entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencias_notificacoes" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "categoria" "CategoriaNotificacao" NOT NULL,
    "canal" "CanalNotificacao" NOT NULL,
    "habilitada" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "preferencias_notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacoes_fabrico_id_ocorreu_em_idx" ON "notificacoes"("fabrico_id", "ocorreu_em");

-- CreateIndex
CREATE INDEX "notificacoes_fabrico_id_tipo_idx" ON "notificacoes"("fabrico_id", "tipo");

-- CreateIndex
CREATE INDEX "notificacoes_fabrico_id_chave_deduplicacao_idx" ON "notificacoes"("fabrico_id", "chave_deduplicacao");

-- CreateIndex
CREATE INDEX "notificacoes_destinatarios_usuario_id_lida_em_created_at_idx" ON "notificacoes_destinatarios"("usuario_id", "lida_em", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_destinatarios_notificacao_id_usuario_id_key" ON "notificacoes_destinatarios"("notificacao_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_entregas_notificacao_destinatario_id_canal_key" ON "notificacoes_entregas"("notificacao_destinatario_id", "canal");

-- CreateIndex
CREATE UNIQUE INDEX "preferencias_notificacoes_usuario_id_categoria_canal_key" ON "preferencias_notificacoes"("usuario_id", "categoria", "canal");

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_destinatarios" ADD CONSTRAINT "notificacoes_destinatarios_notificacao_id_fkey" FOREIGN KEY ("notificacao_id") REFERENCES "notificacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_destinatarios" ADD CONSTRAINT "notificacoes_destinatarios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_entregas" ADD CONSTRAINT "notificacoes_entregas_notificacao_destinatario_id_fkey" FOREIGN KEY ("notificacao_destinatario_id") REFERENCES "notificacoes_destinatarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencias_notificacoes" ADD CONSTRAINT "preferencias_notificacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
