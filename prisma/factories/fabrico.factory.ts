import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

export const FabricoFactory = {
    build(overrides = {}) {
        const companyName = faker.company.name();
        return {
            foto_de_perfil: faker.image.avatar(),
            cnpj: faker.string.numeric(14),
            razao_social: `${companyName} LTDA`,
            nome_fantasia: companyName,
            ativo: true,
            ...overrides,
        };
    },

    // Receba o prisma aqui vindo do seed.ts
    async create(prisma: PrismaClient, overrides = {}) {
        const data = this.build(overrides);

        return prisma.fabrico.upsert({
            where: { cnpj: data.cnpj || "" },
            update: {},
            create: data,
        });
    },
};
