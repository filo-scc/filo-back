import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

export const ParceiroFactory = {
    build(overrides: any = {}) {
        const { fabrico_id, endereco, ...restOverrides } = overrides;

        return {
            nome: `Parceiro ${faker.person.firstName()}`,
            telefone: faker.phone.number({ style: "national" }),

            // Liga a Facção ao Fabrico obrigatoriamente
            ...(fabrico_id ? { fabrico: { connect: { id: fabrico_id } } } : {}),

            // Nested Write: O Prisma cria a Facção e o Endereço juntos
            endereco: {
                create: endereco || {
                    rua: faker.location.street(),
                    numero: faker.location.buildingNumber(),
                    bairro: faker.location.county(),
                    cidade: faker.location.city(),
                    estado: faker.location.state({ abbreviated: true }),
                },
            },
            ...restOverrides,
        };
    },

    async create(prisma: PrismaClient, overrides: any = {}) {
        const data = this.build(overrides);

        return prisma.parceiro.upsert({
            // Usando a chave composta gerada pelo @@unique no schema
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
