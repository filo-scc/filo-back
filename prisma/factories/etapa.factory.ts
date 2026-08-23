import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

export const EtapaFactory = {
    build(overrides: any = {}) {
        // Extraímos fabrico_id e icone para tratá-los separadamente
        const { fabrico_id, icone, icone_verde, icone_cinza, ...restOverrides } = overrides;

        return {
            nome: "Etapa Genérica",
            descricao: faker.lorem.sentence(),
            ordem: 1, // Será substituído no seed.ts
            ativa: true,

            ...(fabrico_id ? { fabrico: { connect: { id: fabrico_id } } } : {}),

            icone: {
                create: icone || {
                    link: faker.image.url(),
                },
            },

            icone_verde: {
                create: icone_verde || {
                    link: faker.image.url(),
                },
            },

            icone_cinza: {
                create: icone_cinza || {
                    link: faker.image.url(),
                },
            },

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
