import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { fakerPT_BR as faker } from "@faker-js/faker";

// Importação das Factories
import { FabricoFactory } from "./factories/fabrico.factory";
import { UsuarioFactory } from "./factories/usario.factory"; // Mantenha o nome do seu arquivo aqui
import { FaccaoFactory } from "./factories/faccao.factory";
import { ClienteFactory } from "./factories/cliente.factory";
import { EtapaFactory } from "./factories/etapa.factory";
import { ProdutoFactory } from "./factories/produto.factory";
import { FichaTecnicaFactory } from "./factories/ficha-tecnica.factory";
import { ClienteProdutoFactory } from "./factories/cliente-produto.factory";
import { FaccaoProdutoFactory } from "./factories/faccao-produto.factory";

// 1. Instanciando o adaptador do Prisma
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

// 2. Iniciando o cliente
const prisma = new PrismaClient({ adapter });

async function main() {

    // Verifica se já existem dados para evitar duplicação
    const fabricosExistentes = await prisma.fabrico.count();
    if (fabricosExistentes > 0) {
        console.log(`Banco já possui dados (${fabricosExistentes} fabricos). Seed ignorado.`);
        return;
    }

    const quantidadeDeFabricos = 5;
    const fabricos: any[] = [];

    // 3. Loop para criar 5 Fabricos usando a Factory
    console.log(`🏭 Criando ${quantidadeDeFabricos} Fabricos (Empresas)...`);
    for (let i = 1; i <= quantidadeDeFabricos; i++) {
        const fabrico = await FabricoFactory.create(prisma);
        fabricos.push(fabrico);
    }

    // 4. Populando cada Fabrico
    for (const fabricoAtual of fabricos) {
        // --- FACÇÕES ---
        const faccoesCriadas: any[] = [];
        for (let j = 1; j <= 2; j++) {
            const faccao = await FaccaoFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
            });
            faccoesCriadas.push(faccao);
        }

        // --- CLIENTES ---
        const clientesCriados: any[] = [];
        for (let k = 1; k <= 3; k++) {
            const cliente = await ClienteFactory.create(prisma, { fabrico_id: fabricoAtual.id });
            clientesCriados.push(cliente);
        }

        // --- USUÁRIOS ---
        for (let l = 1; l <= 4; l++) {
            let cargoDefinido = "GERENTE";

            if (l === 1) {
                cargoDefinido = "PROPRIETARIO";
            } else if (l === 2) {
                cargoDefinido = "ADMIN";
            }

            await UsuarioFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
                cargo: cargoDefinido,
                senha: "senha123",
            });
        }

        // --- ETAPAS DO KANBAN ---
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
                nome: nomesEtapas[m],
                ordem: m + 1,
            });
            etapasCriadas.push(etapa);
        }

        // --- PRODUTOS E INTEGRAÇÕES ---
        for (let p = 1; p <= 5; p++) {
            // Cria o Produto Base
            const produto = await ProdutoFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
            });

            // Sorteia uma etapa aleatória para o Kanban parecer em movimento real
            const etapaAleatoria = faker.helpers.arrayElement(etapasCriadas);
            const isUltimaEtapa = etapaAleatoria.nome === "Embalagem";

            await FichaTecnicaFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
                produto_id: produto.id,
                etapa_atual_id: etapaAleatoria.id,
                // Se caiu na embalagem, existe 50% de chance de já constar como concluída!
                concluida: isUltimaEtapa ? faker.datatype.boolean() : false,
            });

            // Sorteia Cliente e Facção DENTRO do loop para garantir diversidade
            const clienteSorteado = faker.helpers.arrayElement(clientesCriados);
            const faccaoSorteada = faker.helpers.arrayElement(faccoesCriadas);

            await ClienteProdutoFactory.create(prisma, {
                produto_id: produto.id,
                cliente_id: clienteSorteado.id,
            });

            await FaccaoProdutoFactory.create(prisma, {
                produto_id: produto.id,
                faccao_id: faccaoSorteada.id,
            });
        }
    }

    console.log("\n Seed finalizada com sucesso!.");
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
