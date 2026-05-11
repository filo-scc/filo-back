-- CreateTable
CREATE TABLE "aviamentos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "fabrico_id" INTEGER NOT NULL,

    CONSTRAINT "aviamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aviamentos_nome_fabrico_id_key" ON "aviamentos"("nome", "fabrico_id");

-- AddForeignKey
ALTER TABLE "aviamentos" ADD CONSTRAINT "aviamentos_fabrico_id_fkey" FOREIGN KEY ("fabrico_id") REFERENCES "fabricos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
