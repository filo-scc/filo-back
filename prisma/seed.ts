import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { FabricoFactory } from "./factories/fabrico.factory";
import { UsuarioFactory } from "./factories/usario.factory";
import { FaccaoFactory } from "./factories/faccao.factory";
import { ClienteFactory } from "./factories/cliente.factory";

// 1. Instanciando o adaptador do Prisma 7.6 com a URL do seu .env
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

// 2. Iniciando o cliente com o adaptador
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Iniciando o seed de Fabricos...");

    const quantidadeDeFabricos = 5;
    const fabricos: any[] = [];
    // 3. Loop para criar 5 Fabricos usando a Factory
    for (let i = 1; i <= quantidadeDeFabricos; i++) {
        const fabrico = await FabricoFactory.create(prisma);
        fabricos.push(fabrico);
    }

    for (const fabricoAtual of fabricos) {
        for (let j = 1; j <= 2; j++) {
            await FaccaoFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
            });
        }
        for (let k = 1; k <= 3; k++) {
            await ClienteFactory.create(prisma, { fabrico_id: fabricoAtual.id });
        }
        for (let l = 1; l <= 4; l++) {
            let cargoDefinido = "MEMBRO";

            if (l === 1) {
                cargoDefinido = "DONO"; // Apenas o 1º do loop vira DONO
            } else if (l === 2) {
                cargoDefinido = "ADMIN"; // Apenas o 2º do loop vira ADMIN
            }

            await UsuarioFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
                cargo: cargoDefinido,
                senha: "senha123", // O hash continuará sendo feito na Factory
            });
        }
        console.log("\n Seed finalizada com sucesso!");
    }
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
