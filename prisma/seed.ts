import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { fakerPT_BR as faker } from "@faker-js/faker";

import { FabricoFactory } from "./factories/fabrico.factory";
import { UsuarioFactory } from "./factories/usario.factory";
import { ParceiroFactory } from "./factories/faccao.factory";
import { ClienteFactory } from "./factories/cliente.factory";
import { EtapaFactory } from "./factories/etapa.factory";
import { ProdutoFactory } from "./factories/produto.factory";
import { ClienteProdutoFactory } from "./factories/cliente-produto.factory";
import { ParceiroProdutoFactory } from "./factories/faccao-produto.factory";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

type VersaoGradeSeed = {
    id: number;
    grade_id: number;
    versao: number;
    ativo: boolean;
    itens: {
        id: number;
        grade_versao_id: number;
        tamanho_id: number;
        posicao: number;
    }[];
};

async function criarBaseDeGrades() {
    const tamanhosBase = [
        { codigo: "PP", ordem_global: 1 },
        { codigo: "P", ordem_global: 2 },
        { codigo: "M", ordem_global: 3 },
        { codigo: "G", ordem_global: 4 },
        { codigo: "GG", ordem_global: 5 },
        { codigo: "XG", ordem_global: 6 },
    ];

    const gradesBase = [
        { nome: "Padrão", versoes: [1, 2] },
        { nome: "Plus Size", versoes: [1] },
    ];

    const tamanhosCriados: any[] = [];
    for (const tamanho of tamanhosBase) {
        const criado = await prisma.tamanho.create({
            data: tamanho,
        });
        tamanhosCriados.push(criado);
    }

    const gradesCriadas: any[] = [];
    const versoesCriadas: VersaoGradeSeed[] = [];

    for (const gradeBase of gradesBase) {
        const grade = await prisma.grade.create({
            data: {
                nome: gradeBase.nome,
                ativo: true,
            },
        });

        gradesCriadas.push(grade);

        for (let i = 0; i < tamanhosCriados.length; i++) {
            await prisma.gradeItem.create({
                data: {
                    grade_id: grade.id,
                    tamanho_id: tamanhosCriados[i].id,
                    posicao: i + 1,
                },
            });
        }

        for (const versaoNumero of gradeBase.versoes) {
            const versao = await prisma.gradeVersao.create({
                data: {
                    grade_id: grade.id,
                    versao: versaoNumero,
                    ativo: versaoNumero === 1,
                },
            });

            const itensDaVersao: any[] = [];
            for (let i = 0; i < tamanhosCriados.length; i++) {
                const item = await prisma.gradeVersaoItem.create({
                    data: {
                        grade_versao_id: versao.id,
                        tamanho_id: tamanhosCriados[i].id,
                        posicao: i + 1,
                    },
                });

                itensDaVersao.push(item);
            }

            versoesCriadas.push({
                ...versao,
                itens: itensDaVersao,
            });
        }
    }

    return {
        tamanhosCriados,
        gradesCriadas,
        versoesCriadas,
    };
}

async function criarCoresDoFabrico(fabricoId: number) {
    const nomesCores = [
        "Preto",
        "Branco",
        "Azul Marinho",
        "Vermelho",
        "Cinza",
        "Verde",
        "Bege",
        "Rosa",
    ];

    const coresCriadas: any[] = [];

    for (const nome of nomesCores) {
        const cor = await prisma.cor.create({
            data: {
                fabrico_id: fabricoId,
                nome,
                codigo_hex: faker.color.rgb(),
            },
        });

        coresCriadas.push(cor);
    }

    return coresCriadas;
}

async function criarLinksFabricoGrades(fabricoId: number, grades: any[]) {
    for (const grade of grades) {
        await prisma.fabricoGrade.create({
            data: {
                fabrico_id: fabricoId,
                grade_id: grade.id,
                ativo: true,
            },
        });
    }
}

async function main() {
    // Verifica se já existem dados para evitar duplicação
    const fabricosExistentes = await prisma.fabrico.count();
    if (fabricosExistentes > 0) {
        console.log(`Banco já possui dados (${fabricosExistentes} fabricos). Seed ignorado.`);
        return;
    }

    const quantidadeDeFabricos = 5;
    const fabricos: any[] = [];

    const { gradesCriadas, versoesCriadas } = await criarBaseDeGrades();

    for (let i = 1; i <= quantidadeDeFabricos; i++) {
        const fabrico = await FabricoFactory.create(prisma);
        fabricos.push(fabrico);
    }

    for (const fabricoAtual of fabricos) {
        // --- BASE VISUAL E RELAÇÕES DO FABRICO ---
        const coresCriadas = await criarCoresDoFabrico(fabricoAtual.id);
        await criarLinksFabricoGrades(fabricoAtual.id, gradesCriadas);

        // --- PARCEIROS ---
        const parceirosCriados: any[] = [];
        for (let j = 1; j <= 2; j++) {
            const parceiro = await ParceiroFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
            });
            parceirosCriados.push(parceiro);
        }

        // --- CLIENTES ---
        const clientesCriados: any[] = [];
        for (let k = 1; k <= 3; k++) {
            const cliente = await ClienteFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
            });
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

        // --- PRODUTOS, FICHAS TÉCNICAS E ITENS ---
        for (let p = 1; p <= 5; p++) {
            const produto = await ProdutoFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
            });

            const gradeVersaoEscolhida = faker.helpers.arrayElement(versoesCriadas);
            const etapaAleatoria = faker.helpers.arrayElement(etapasCriadas);

            await prisma.produto.update({
                where: { id: produto.id },
                data: {
                    grade_versao_id: gradeVersaoEscolhida.id,
                },
            });

            const fichaTecnica = await prisma.fichaTecnica.create({
                data: {
                    observacoes: faker.lorem.sentence(),
                    concluida:
                        etapaAleatoria.nome === "Embalagem" ? faker.datatype.boolean() : false,
                    fabrico_id: fabricoAtual.id,
                    produto_id: produto.id,
                    grade_versao_id: gradeVersaoEscolhida.id,
                    etapa_atual_id: etapaAleatoria.id,
                },
            });

            const quantidadeItens = faker.number.int({
                min: 2,
                max: Math.min(4, gradeVersaoEscolhida.itens.length),
            });

            const itensEscolhidos = faker.helpers.arrayElements(
                gradeVersaoEscolhida.itens,
                quantidadeItens,
            );

            for (const itemGrade of itensEscolhidos) {
                const corSorteada = faker.helpers.arrayElement(coresCriadas);

                await prisma.fichaTecnicaItem.create({
                    data: {
                        ficha_tecnica_id: fichaTecnica.id,
                        cor_id: corSorteada.id,
                        grade_versao_item_id: itemGrade.id,
                        quantidade: faker.number.int({ min: 10, max: 250 }),
                    },
                });
            }

            const clienteSorteado = faker.helpers.arrayElement(clientesCriados);
            const parceiroSorteado = faker.helpers.arrayElement(parceirosCriados);

            await ClienteProdutoFactory.create(prisma, {
                produto_id: produto.id,
                cliente_id: clienteSorteado.id,
            });

            await ParceiroProdutoFactory.create(prisma, {
                produto_id: produto.id,
                parceiro_id: parceiroSorteado.id,
            });
        }
    }

    console.log("\n✅ Seed finalizada com sucesso!");
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
