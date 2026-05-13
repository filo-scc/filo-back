-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "tecido_id" INTEGER;

-- CreateTable
CREATE TABLE "tecidos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "fabrico_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tecidos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tecidos_fabrico_id_idx" ON "tecidos"("fabrico_id");

-- CreateIndex
CREATE UNIQUE INDEX "tecidos_fabrico_id_nome_key" ON "tecidos"("fabrico_id", "nome");

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_tecido_id_fkey" FOREIGN KEY ("tecido_id") REFERENCES "tecidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tecidos" ADD CONSTRAINT "tecidos_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
