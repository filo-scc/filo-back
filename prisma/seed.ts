import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { FabricoFactory } from "./factories/fabrico.factory";

// 1. Instanciando o adaptador do Prisma 7.6 com a URL do seu .env
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

// 2. Iniciando o cliente com o adaptador
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Iniciando o seed de Fabricos...");

    const quantidadeDeFabricos = 5;

    // 3. Loop para criar 5 Fabricos usando a Factory
    for (let i = 1; i <= quantidadeDeFabricos; i++) {
        await FabricoFactory.create(prisma);
    }

    console.log("🎉 Seed de Fabricos concluído com sucesso!");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error("❌ Erro durante o seed:", e);
        await prisma.$disconnect();
        process.exit(1);
    });
