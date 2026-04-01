import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

export const FichaTecnicaFactory = {
    build(overrides: any = {}) {
        // Extraímos os IDs que vêm lá do seed.ts
        const { fabrico_id, produto_id, etapa_atual_id, ...restOverrides } = overrides;

        return {
            // Gera instruções falsas de costura/modelagem para dar realismo
            observacoes: `Instruções de produção: ${faker.lorem.lines(2)}`,
            concluida: false, // Toda ficha nova entra como pendente na esteira

            // 1. Conecta a ficha à Empresa (Obrigatório)
            ...(fabrico_id ? { fabrico: { connect: { id: fabrico_id } } } : {}),

            // 2. Conecta a ficha ao Produto que acabou de ser criado (Obrigatório)
            ...(produto_id ? { produto: { connect: { id: produto_id } } } : {}),

            // 3. Coloca a ficha na primeira Etapa do Kanban (Opcional, mas muito útil)
            ...(etapa_atual_id ? { etapa_atual: { connect: { id: etapa_atual_id } } } : {}),

            ...restOverrides,
        };
    },

    async create(prisma: PrismaClient, overrides: any = {}) {
        const data = this.build(overrides);

        // Usamos o create padrão para inserir a ficha no banco
        return prisma.fichaTecnica.create({
            data,
        });
    },
};
