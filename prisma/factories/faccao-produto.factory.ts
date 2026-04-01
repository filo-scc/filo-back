import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

export const FaccaoProdutoFactory = {
    build(overrides: any = {}) {
        const { produto_id, faccao_id, ...restOverrides } = overrides;

        return {
            // Gera um preço de custo (terceirização) mais baixo, entre R$ 5 e R$ 45
            preco: parseFloat(faker.commerce.price({ min: 5, max: 45 })),

            // Conecta ao Produto (Obrigatório)
            ...(produto_id ? { produto: { connect: { id: produto_id } } } : {}),

            // Conecta à Facção (Obrigatório)
            ...(faccao_id ? { faccao: { connect: { id: faccao_id } } } : {}),

            ...restOverrides,
        };
    },

    async create(prisma: PrismaClient, overrides: any = {}) {
        const data = this.build(overrides);

        return prisma.faccaoProduto.upsert({
            where: {
                // Sintaxe do Prisma para chaves primárias compostas @@id
                produto_id_faccao_id: {
                    produto_id: overrides.produto_id,
                    faccao_id: overrides.faccao_id,
                },
            },
            update: {},
            create: data,
        });
    },
};
