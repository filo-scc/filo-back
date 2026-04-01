import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";
import bcrypt from "bcrypt";

export const UsuarioFactory = {
    async build(overrides: any = {}) {
        const senhaPlana = overrides.senha || "123456";
        const senhaHash = await bcrypt.hash(senhaPlana, 10);

        const { fabrico_id, endereco, ...restOverrides } = overrides;

        delete restOverrides.senha;

        return {
            nome: faker.person.fullName(),
            email: faker.internet.email().toLowerCase(),
            senha: senhaHash,
            foto_de_perfil: faker.image.url(),

            ...(fabrico_id ? { fabrico: { connect: { id: fabrico_id } } } : {}),

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
        const data = await this.build(overrides);

        return prisma.usuario.upsert({
            where: { email: data.email },
            update: {},
            create: data,
        });
    },
};
