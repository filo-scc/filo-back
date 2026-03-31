import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";
import bcrypt from "bcrypt";

export const UsuarioFactory = {
    async build(overrides: any = {}) {
        const senhaPlana = overrides.senha || "123456";
        const senhaHash = await bcrypt.hash(senhaPlana, 10);

        // Separamos senha, fabrico_id e endereco para não dar conflito no spread
        const { fabrico_id, endereco, ...restOverrides } = overrides;

        delete restOverrides.senha;

        return {
            nome: faker.person.fullName(),
            email: faker.internet.email().toLowerCase(),
            senha: senhaHash,
            foto_de_perfil: faker.image.avatar(),

            // Se vier um fabrico_id, nós conectamos o usuário a ele
            ...(fabrico_id ? { fabrico: { connect: { id: fabrico_id } } } : {}),

            // Nested Write: O Prisma já cria o endereço e faz o relacionamento sozinho!
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

        // O upsert é perfeito porque evita o erro P2002 (conflito de email)
        // que você trata no seu Service!
        return prisma.usuario.upsert({
            where: { email: data.email },
            update: {}, // Se já existir, não faz nada
            create: data, // Se não existir, cria o usuário E o endereço de uma vez
        });
    },
};
