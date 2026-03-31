import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

export const EtapaFactory = {
    build(overrides: any = {}) {
        const { fabrico_id, ...restOverrides } = overrides;

        return {
            nome: "Etapa Genérica", // Será substituído no seed
            descricao: faker.lorem.sentence(), // Uma descrição falsa para dar volume
            ordem: 1, // Será substituído no seed
            ativa: true,

            // Conecta ao Fabrico
            ...(fabrico_id ? { fabrico: { connect: { id: fabrico_id } } } : {}),

            ...restOverrides,
        };
    },

    async create(prisma: PrismaClient, overrides: any = {}) {
        const data = this.build(overrides);

        return prisma.etapa.upsert({
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
