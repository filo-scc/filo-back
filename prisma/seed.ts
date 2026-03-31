import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { FabricoFactory } from "./factories/fabrico.factory";
import { UsuarioFactory } from "./factories/usario.factory";

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

    console.log("🎉 Seed de Fabricos concluído com sucesso!");
    

    for (let i = 0; i < 30; i++) {
        const indiceFabrico = i % 5;
        const fabricoAtual = fabricos[indiceFabrico];

        let cargoDefinido = "MEMBRO";
        if (i < 5) {
            cargoDefinido = "DONO";
        } else if (i % 3 === 0) {
            cargoDefinido = "ADMIN";
        }

        const usuario = await UsuarioFactory.create(prisma, {
            fabrico_id: fabricoAtual.id,
            cargo: cargoDefinido,
            senha: "senha123" // O hash continuará sendo feito na Factory
        });

        console.log(`✅ [User ${i + 1}/30] ${usuario.nome} | Cargo: ${usuario.cargo.padEnd(6)} | Fabrico: ${fabricoAtual.nome_fantasia}`);
    }

    console.log('\n✨ Seed finalizado com sucesso!');
    console.log('📊 Resumo: 5 Fabricos criados. Cada fabrico recebeu 6 usuários (1 DONO e 5 entre ADMIN/MEMBRO).');
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
