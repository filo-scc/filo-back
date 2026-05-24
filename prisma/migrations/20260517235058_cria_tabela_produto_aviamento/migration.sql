-- CreateTable
CREATE TABLE "produtos_aviamentos" (
    "id" SERIAL NOT NULL,
    "custo" DECIMAL(10,2),
    "produto_id" INTEGER NOT NULL,
    "aviamento_id" INTEGER NOT NULL,

    CONSTRAINT "produtos_aviamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "produtos_aviamentos_produto_id_aviamento_id_key" ON "produtos_aviamentos"("produto_id", "aviamento_id");

-- AddForeignKey
ALTER TABLE "produtos_aviamentos" ADD CONSTRAINT "produtos_aviamentos_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos_aviamentos" ADD CONSTRAINT "produtos_aviamentos_aviamento_id_fkey" FOREIGN KEY ("aviamento_id") REFERENCES "aviamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
