import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { FabricoFactory } from "./factories/fabrico.factory";
import { UsuarioFactory } from "./factories/usario.factory";
import { FaccaoFactory } from "./factories/faccao.factory";
import { ClienteFactory } from "./factories/cliente.factory";
import { EtapaFactory } from "./factories/etapa.factory";
import { ProdutoFactory } from "./factories/produto.factory";
import { FichaTecnicaFactory } from "./factories/ficha-tecnica.factory";
import { ClienteProdutoFactory } from "./factories/cliente-produto.factory";
import { fakerPT_BR as faker } from "@faker-js/faker";
import { FaccaoProdutoFactory } from "./factories/faccao-produto.factory";

// 1. Instanciando o adaptador do Prisma 7.6 com a URL do seu .env
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

// 2. Iniciando o cliente com o adaptador
const prisma = new PrismaClient({ adapter });

async function main() {
    const quantidadeDeFabricos = 5;
    const fabricos: any[] = [];
    // 3. Loop para criar 5 Fabricos usando a Factory
    for (let i = 1; i <= quantidadeDeFabricos; i++) {
        const fabrico = await FabricoFactory.create(prisma);
        fabricos.push(fabrico);
    }

    for (const fabricoAtual of fabricos) {
        const faccoesCriadas: any[] = [];
        //faccao
        for (let j = 1; j <= 2; j++) {
            const faccao = await FaccaoFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
            });
            faccoesCriadas.push(faccao);
        }

        //cliente
        const clientesCriados: any[] = [];
        for (let k = 1; k <= 3; k++) {
            const cliente = await ClienteFactory.create(prisma, { fabrico_id: fabricoAtual.id });
            clientesCriados.push(cliente);
        }

        //usuario
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

        const etapasCriadas: any[] = [];

        const nomesEtapas = [
            "Modelagem",
            "Corte",
            "Estamparia/Bordado",
            "Costura",
            "Acabamento",
            "Embalagem",
        ];

        for (let m = 0; m < nomesEtapas.length; m++) {
            const etapa = await EtapaFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
                nome: nomesEtapas[m], // Pega o nome real da etapa
                ordem: m + 1, // A ordem vai de 1 a 6
            });
            etapasCriadas.push(etapa);
        }

        //Produto
        const clienteSorteado = faker.helpers.arrayElement(clientesCriados);
        for (let p = 1; p <= 5; p++) {
            const produto = await ProdutoFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
            });
            await FichaTecnicaFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
                produto_id: produto.id,
                etapa_atual_id: etapasCriadas[0].id, // Pega o ID da etapa "Modelagem"
                concluida: false,
            });
            await ClienteProdutoFactory.create(prisma, {
                produto_id: produto.id,
                cliente_id: clienteSorteado.id,
            });
            const faccaoSorteada = faker.helpers.arrayElement(faccoesCriadas);

            await FaccaoProdutoFactory.create(prisma, {
                produto_id: produto.id,
                faccao_id: faccaoSorteada.id,
            });
        }
    }
}
console.log("\n Seed finalizada com sucesso!");

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error("❌ Erro durante o seed:", e);
        await prisma.$disconnect();
        process.exit(1);
    });
