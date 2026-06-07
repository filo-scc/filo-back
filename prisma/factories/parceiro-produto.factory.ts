import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

export const ParceiroProdutoFactory = {
    build(overrides: any = {}) {
        const { produto_id, parceiro_id, ...restOverrides } = overrides;

        return {
            // Gera um preço de custo (terceirização) mais baixo, entre R$ 5 e R$ 45
            preco: parseFloat(faker.commerce.price({ min: 5, max: 45 })),

            // Conecta ao Produto (Obrigatório)
            ...(produto_id ? { produto: { connect: { id: produto_id } } } : {}),

            // Conecta ao Parceiro (Obrigatório)
            ...(parceiro_id ? { parceiro: { connect: { id: parceiro_id } } } : {}),

            ...restOverrides,
        };
    },

    async create(prisma: PrismaClient, overrides: any = {}) {
        const data = this.build(overrides);

        return prisma.parceiroProduto.upsert({
            where: {
                // Sintaxe do Prisma para chaves primárias compostas @@id
                produto_id_parceiro_id: {
                    produto_id: overrides.produto_id,
                    parceiro_id: overrides.parceiro_id,
                },
            },
            update: {},
            create: data,
        });
    },
};
