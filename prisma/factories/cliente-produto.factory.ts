import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

export const ClienteProdutoFactory = {
    build(overrides: any = {}) {
        // Extraímos as chaves estrangeiras
        const { produto_id, cliente_id, ...restOverrides } = overrides;

        return {
            // Gera um código de referência interno do cliente (ex: REF-A8F9B)
            nome_para_cliente: `REF-${faker.string.alphanumeric({ length: 5, casing: "upper" })}`,

            // Gera um preço negociado aleatório entre R$ 30 e R$ 250
            preco_padrao: parseFloat(faker.commerce.price({ min: 30, max: 250 })),

            // Conecta ao Produto (Obrigatório)
            ...(produto_id ? { produto: { connect: { id: produto_id } } } : {}),

            // Conecta ao Cliente (Obrigatório)
            ...(cliente_id ? { cliente: { connect: { id: cliente_id } } } : {}),

            ...restOverrides,
        };
    },

    async create(prisma: PrismaClient, overrides: any = {}) {
        const data = this.build(overrides);

        return prisma.clienteProduto.upsert({
            where: {
                // Sintaxe do Prisma para chaves primárias compostas @@id([col1, col2])
                produto_id_cliente_id: {
                    produto_id: overrides.produto_id,
                    cliente_id: overrides.cliente_id,
                },
            },
            update: {},
            create: data,
        });
    },
};
