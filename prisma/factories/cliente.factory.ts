import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

export const ClienteFactory = {
    build(overrides: any = {}) {
        const { fabrico_id, endereco, ...restOverrides } = overrides;

        return {
            nome: faker.company.name(),
            cnpj: faker.string.numeric(14), // Gera os 14 números do CNPJ
            telefone: faker.phone.number({ style: "national" }),
            responsavel: faker.person.fullName(), // Nome do contato no cliente
            status: true,

            // Conecta ao Fabrico
            ...(fabrico_id ? { fabrico: { connect: { id: fabrico_id } } } : {}),

            // Cria o Endereço do Cliente junto
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

        return prisma.cliente.upsert({
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
