import { PrismaClient, TipoCor, TipoProduto, UnidadeDeMedida } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { fakerPT_BR as faker } from "@faker-js/faker";

import { FabricoFactory } from "./factories/fabrico.factory";
import { UsuarioFactory } from "./factories/usario.factory";
import { ParceiroFactory } from "./factories/parceiro.factory";
import { ClienteFactory } from "./factories/cliente.factory";
import { EtapaFactory } from "./factories/etapa.factory";
import { ProdutoFactory } from "./factories/produto.factory";
import { ClienteProdutoFactory } from "./factories/cliente-produto.factory";
import { ParceiroProdutoFactory } from "./factories/parceiro-produto.factory";

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

    const nomesEstampas = ["Floral", "Listrado", "Poá", "Camuflado"];

    const coresCriadas: any[] = [];

    for (const nome of nomesCores) {
        const cor = await prisma.cor.create({
            data: {
                fabrico_id: fabricoId,
                nome,
                codigo_hex: faker.color.rgb(),
                tipo: TipoCor.COR,
            },
        });

        coresCriadas.push(cor);
    }

    for (const nome of nomesEstampas) {
        const estampa = await prisma.cor.create({
            data: {
                fabrico_id: fabricoId,
                nome,
                codigo_hex: faker.color.rgb(),
                tipo: TipoCor.ESTAMPA,
                foto: faker.image.url(),
            },
        });

        coresCriadas.push(estampa);
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

async function criarTiposProduto(fabricoId: number) {
    const nomes = ["Camiseta", "Calça", "Short", "Vestido", "Jaqueta"];

    const tiposCriados: TipoProduto[] = [];

    for (const nome of nomes) {
        const tipo = await prisma.tipoProduto.create({
            data: {
                nome,
                fabrico_id: fabricoId,
            },
        });

        tiposCriados.push(tipo);
    }

    return tiposCriados;
}

async function criarTecidosDoFabrico(fabricoId: number) {
    const tecidosBase = [
        { nome: "Malha", unidade_de_medida: UnidadeDeMedida.METRO },
        { nome: "Algodão", unidade_de_medida: UnidadeDeMedida.METRO },
        { nome: "Jeans", unidade_de_medida: UnidadeDeMedida.METRO },
        { nome: "Linho", unidade_de_medida: UnidadeDeMedida.METRO },
        { nome: "Moletom", unidade_de_medida: UnidadeDeMedida.QUILOGRAMA },
    ];

    const tecidosCriados: any[] = [];

    for (const tecido of tecidosBase) {
        const criado = await prisma.tecido.create({
            data: {
                fabrico_id: fabricoId,
                nome: tecido.nome,
                unidade_de_medida: tecido.unidade_de_medida,
                custo_unitario: parseFloat(faker.commerce.price({ min: 8, max: 80, dec: 2 })),
            },
        });

        tecidosCriados.push(criado);
    }

    return tecidosCriados;
}

async function criarAviamentosDoFabrico(fabricoId: number) {
    const aviamentosBase = [
        { nome: "Botão", unidade_de_medida: UnidadeDeMedida.UNIDADE },
        { nome: "Zíper", unidade_de_medida: UnidadeDeMedida.UNIDADE },
        { nome: "Linha", unidade_de_medida: UnidadeDeMedida.METRO },
        { nome: "Etiqueta", unidade_de_medida: UnidadeDeMedida.UNIDADE },
        { nome: "Elástico", unidade_de_medida: UnidadeDeMedida.METRO },
    ];

    const aviamentosCriados: any[] = [];

    for (const aviamento of aviamentosBase) {
        const criado = await prisma.aviamento.create({
            data: {
                fabrico_id: fabricoId,
                nome: aviamento.nome,
                unidade_de_medida: aviamento.unidade_de_medida,
                custo_unitario: parseFloat(faker.commerce.price({ min: 0.1, max: 15, dec: 3 })),
            },
        });

        aviamentosCriados.push(criado);
    }

    return aviamentosCriados;
}

async function criarFichaEtapas(ficha: { id: number; concluida: boolean }, etapas: any[], etapaAtual: any) {
    const etapasOrdenadas = [...etapas].sort((a, b) => a.ordem - b.ordem);
    const indiceAtual = etapasOrdenadas.findIndex((etapa) => etapa.id === etapaAtual.id);
    const ultimoIndice = indiceAtual >= 0 ? indiceAtual : 0;

    for (let i = 0; i <= ultimoIndice; i++) {
        const isAtual = i === ultimoIndice;
        const dataInicio = faker.date.recent({ days: 20 - i * 2 });
        const deveEncerrar = !isAtual || ficha.concluida;

        await prisma.fichaEtapa.create({
            data: {
                ficha_tecnica_id: ficha.id,
                etapa_id: etapasOrdenadas[i].id,
                data_inicio: dataInicio,
                data_fim: deveEncerrar
                    ? new Date(dataInicio.getTime() + faker.number.int({ min: 1, max: 3 }) * 86_400_000)
                    : null,
                observacoes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
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
        const tiposProdutoCriados = await criarTiposProduto(fabricoAtual.id);
        const tecidosCriados = await criarTecidosDoFabrico(fabricoAtual.id);
        const aviamentosCriados = await criarAviamentosDoFabrico(fabricoAtual.id);
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
        let numeroPedido = 1;
        let numeroFicha = 1;

        for (let p = 1; p <= 5; p++) {
            const tipoEscolhido = faker.helpers.arrayElement(tiposProdutoCriados);
            const tecidoSorteado = faker.helpers.arrayElement(tecidosCriados);
            const gradeVersaoEscolhida = faker.helpers.arrayElement(versoesCriadas);
            const etapaAleatoria = faker.helpers.arrayElement(etapasCriadas);
            const clienteSorteado = faker.helpers.arrayElement(clientesCriados);
            const parceiroSorteado = faker.helpers.arrayElement(parceirosCriados);

            const produto = await ProdutoFactory.create(prisma, {
                fabrico_id: fabricoAtual.id,
                tipo_produto_id: tipoEscolhido.id,
                tipo_nome: tipoEscolhido.nome,
                tecido_id: tecidoSorteado.id,
                grade_versao_id: gradeVersaoEscolhida.id,
            });

            const aviamentosDoProduto = faker.helpers.arrayElements(
                aviamentosCriados,
                faker.number.int({ min: 1, max: Math.min(3, aviamentosCriados.length) }),
            );

            for (const aviamento of aviamentosDoProduto) {
                await prisma.produtoAviamento.create({
                    data: {
                        produto_id: produto.id,
                        aviamento_id: aviamento.id,
                        quantidade: faker.number.float({ min: 1, max: 20, fractionDigits: 2 }),
                        custo: parseFloat(faker.commerce.price({ min: 0.5, max: 25, dec: 2 })),
                    },
                });
            }

            const quantidadeItens = faker.number.int({
                min: 2,
                max: Math.min(4, gradeVersaoEscolhida.itens.length),
            });

            const itensEscolhidos = faker.helpers.arrayElements(
                gradeVersaoEscolhida.itens,
                quantidadeItens,
            );

            const itensParaCriar = itensEscolhidos.map((itemGrade) => ({
                grade_versao_item_id: itemGrade.id,
                cor_id: faker.helpers.arrayElement(coresCriadas).id,
                quantidade: faker.number.int({ min: 10, max: 250 }),
            }));

            const quantidadeTotal = itensParaCriar.reduce(
                (total, item) => total + item.quantidade,
                0,
            );
            const valorUnitario = parseFloat(faker.commerce.price({ min: 15, max: 80, dec: 2 }));
            const valorTotal = Number((quantidadeTotal * valorUnitario).toFixed(2));

            const pedido = await prisma.pedido.create({
                data: {
                    numero: numeroPedido,
                    finalizado: false,
                    observacoes: faker.lorem.sentence(),
                    data_prevista: faker.date.soon(),
                    cor: faker.color.rgb(),
                    quantidade: quantidadeTotal,
                    valor_total: valorTotal,
                    fabrico: {
                        connect: {
                            id: fabricoAtual.id,
                        },
                    },
                    cliente: {
                        connect: {
                            id: clienteSorteado.id,
                        },
                    },
                },
            });
            numeroPedido += 1;

            const fichaConcluida =
                etapaAleatoria.nome === "Embalagem" ? faker.datatype.boolean() : false;

            const fichaTecnica = await prisma.fichaTecnica.create({
                data: {
                    numero: numeroFicha,
                    observacoes: faker.lorem.sentence(),
                    concluida: fichaConcluida,
                    quantidade: quantidadeTotal,
                    fabrico: {
                        connect: {
                            id: fabricoAtual.id,
                        },
                    },
                    produto: {
                        connect: {
                            id: produto.id,
                        },
                    },
                    grade_versao: {
                        connect: {
                            id: gradeVersaoEscolhida.id,
                        },
                    },
                    etapa_atual: {
                        connect: {
                            id: etapaAleatoria.id,
                        },
                    },
                    pedido: {
                        connect: {
                            id: pedido.id,
                        },
                    },
                },
            });
            numeroFicha += 1;

            for (const item of itensParaCriar) {
                await prisma.fichaTecnicaItem.create({
                    data: {
                        ficha_tecnica_id: fichaTecnica.id,
                        cor_id: item.cor_id,
                        grade_versao_item_id: item.grade_versao_item_id,
                        quantidade: item.quantidade,
                    },
                });
            }

            await criarFichaEtapas(fichaTecnica, etapasCriadas, etapaAleatoria);

            await prisma.fichaParceiro.create({
                data: {
                    ficha_id: fichaTecnica.id,
                    parceiro_id: parceiroSorteado.id,
                    operacao: faker.helpers.arrayElement(["Corte", "Costura", "Estamparia"]),
                    valor: parseFloat(faker.commerce.price({ min: 50, max: 800, dec: 2 })),
                    quantidade: faker.number.int({ min: 10, max: quantidadeTotal }),
                },
            });

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
