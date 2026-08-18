import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

export const ProdutoFactory = {
    build(overrides: any = {}) {
        const { fabrico_id, tipo_produto_id, tipo_nome, tecido_id, grade_versao_id, ...restOverrides } =
            overrides;

        const custo_operacional = parseFloat(faker.commerce.price({ min: 5, max: 500, dec: 2 }));
        const outros_custos = parseFloat(faker.commerce.price({ min: 15, max: 1500, dec: 2 }));
        const custo_tecido = parseFloat(faker.commerce.price({ min: 20, max: 2000, dec: 2 }));
        const quantidade_tecido = parseFloat(faker.commerce.price({ min: 1, max: 1000, dec: 0 }));
        const custo_total = Number((custo_operacional + outros_custos + custo_tecido).toFixed(2));

        return {
            nome: `${tipo_nome} ${faker.commerce.productAdjective()} ${faker.color.human()}`, // Ex: "Camiseta Elegante Azul"
            foto: faker.image.url(), // Traz uma imagem de moda/roupas

            custo_operacional,
            outros_custos,
            custo_tecido,
            quantidade_tecido,
            custo_total,

            // Conecta ao Fabrico (Obrigatório)
            ...(fabrico_id ? { fabrico: { connect: { id: fabrico_id } } } : {}),

            ...(tipo_produto_id ? { tipo_produto: { connect: { id: tipo_produto_id } } } : {}),

            ...(tecido_id ? { tecido: { connect: { id: tecido_id } } } : {}),

            ...(grade_versao_id ? { grade_versao: { connect: { id: grade_versao_id } } } : {}),

            ...restOverrides,
        };
    },

    async create(prisma: PrismaClient, overrides: any = {}) {
        const data = this.build(overrides);

        return prisma.produto.upsert({
            where: {
                fabrico_id_nome: {
                    fabrico_id: overrides.fabrico_id,
                    nome: data.nome,
                },
            },
            update: {},
            create: data,
        });
    },
};
