import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

export const EtapaFactory = {
    build(overrides: any = {}) {
        // Extraímos fabrico_id e icone para tratá-los separadamente
        const { fabrico_id, icone, ...restOverrides } = overrides;

        return {
            nome: "Etapa Genérica", 
            descricao: faker.lorem.sentence(),
            ordem: 1, // Será substituído no seed.ts
            ativa: true,

            ...(fabrico_id ? { fabrico: { connect: { id: fabrico_id } } } : {}),

    
            icone: {
                create: icone || {
                    link: faker.image.avatar(), // Gera o link falso do avatar
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
