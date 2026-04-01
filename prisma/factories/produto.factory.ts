import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

export const ProdutoFactory = {
    build(overrides: any = {}) {
        const { fabrico_id, ...restOverrides } = overrides;

        // Lista de tipos comuns na indústria têxtil para sortear
        const tiposTêxteis = [
            "Camiseta",
            "Calça",
            "Bermuda",
            "Vestido",
            "Jaqueta",
            "Moletom",
            "Boné",
        ];
        const tipoSorteado = faker.helpers.arrayElement(tiposTêxteis);

        return {
            nome: `${tipoSorteado} ${faker.commerce.productAdjective()} ${faker.color.human()}`, // Ex: "Camiseta Elegante Azul"
            tipo: tipoSorteado,
            foto: faker.image.url(), // Traz uma imagem de moda/roupas

            // Conecta ao Fabrico (Obrigatório)
            ...(fabrico_id ? { fabrico: { connect: { id: fabrico_id } } } : {}),

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
