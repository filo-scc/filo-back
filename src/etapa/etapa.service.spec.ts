import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { EtapaService } from "./etapa.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

const mockPrismaService = {
    etapa: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
    icone: {
        findUnique: jest.fn(),
    },
    produto: {
        findMany: jest.fn(),
    },
    fichaTecnica: {
        updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
};

const mockProdutoService = {
    bloquearProdutosParaRecalculo: jest.fn(),
    recalcularCustosTotais: jest.fn(),
};

describe("EtapaService", () => {
    let service: EtapaService;

    const etapaFabrico1 = {
        id: 1,
        fabrico_id: 1,
        nome: "Costura",
        descricao: "Etapa importante",
        ordem: 1,
        ativa: true,
        icone_id: 99,
        icone_verde_id: 88,
        icone_cinza_id: 77,
    };
    const etapaFabrico2 = {
        ...etapaFabrico1,
        id: 2,
        fabrico_id: 2,
        nome: "Embalagem",
    };
    const gerenteFabrico1: AuthenticatedUser = {
        id: 10,
        email: "gerente@filo.test",
        nome: "Gerente",
        foto_de_perfil: null,
        cargo: "GERENTE",
        fabrico_id: 1,
        fabrico: { id: 1, ativo: true },
    };
    const gerenteFabrico2: AuthenticatedUser = {
        id: 20,
        email: "gerente-2@filo.test",
        nome: "Gerente 2",
        foto_de_perfil: null,
        cargo: "GERENTE",
        fabrico_id: 2,
        fabrico: { id: 2, ativo: true },
    };
    const admin: AuthenticatedUser = {
        id: 99,
        email: "admin@filo.test",
        nome: "Admin",
        foto_de_perfil: null,
        cargo: "ADMIN",
        fabrico_id: null,
        fabrico: null,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrismaService.$transaction.mockImplementation((callback) =>
            callback(mockPrismaService),
        );
        mockPrismaService.produto.findMany.mockResolvedValue([]);
        mockPrismaService.etapa.count.mockResolvedValue(0);
        service = new EtapaService(
            mockPrismaService as unknown as PrismaService,
            mockProdutoService as unknown as ProdutoService,
        );
    });

    it("deve ser definido", () => {
        expect(service).toBeDefined();
    });

    describe("create", () => {
        it("associa automaticamente a etapa ao fabrico autenticado", async () => {
            mockPrismaService.icone.findUnique.mockResolvedValue({ id: 99 });
            mockPrismaService.etapa.create.mockResolvedValue(etapaFabrico1);

            const data = { ...etapaFabrico1, fabrico_id: undefined };
            const resultado = await service.create(data, gerenteFabrico1);

            expect(resultado).toEqual(etapaFabrico1);
            expect(mockPrismaService.produto.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: { in: [1] } },
                select: { id: true },
            });
            expect(mockPrismaService.etapa.create).toHaveBeenCalledWith({
                data: { ...data, fabrico_id: 1 },
            });
        });

        it("rejeita criação com fabrico_id de outro tenant", async () => {
            await expect(
                service.create({ ...etapaFabrico1, fabrico_id: 2 }, gerenteFabrico1),
            ).rejects.toThrow(BadRequestException);
            expect(mockPrismaService.etapa.create).not.toHaveBeenCalled();
        });

        it("permite criação por admin quando o fabrico é informado no body", async () => {
            mockPrismaService.etapa.create.mockResolvedValue(etapaFabrico1);

            await service.create(etapaFabrico1, admin);

            expect(mockPrismaService.etapa.create).toHaveBeenCalledWith({
                data: {
                    nome: etapaFabrico1.nome,
                    descricao: etapaFabrico1.descricao,
                    ordem: etapaFabrico1.ordem,
                    ativa: etapaFabrico1.ativa,
                    icone_id: etapaFabrico1.icone_id,
                    icone_verde_id: etapaFabrico1.icone_verde_id,
                    icone_cinza_id: etapaFabrico1.icone_cinza_id,
                    id: etapaFabrico1.id,
                    fabrico_id: 1,
                },
            });
        });

        it("rejeita criação por admin sem fabrico informado", async () => {
            await expect(
                service.create({ ...etapaFabrico1, fabrico_id: undefined }, admin),
            ).rejects.toThrow(BadRequestException);
            expect(mockPrismaService.etapa.create).not.toHaveBeenCalled();
        });

        it("lança NotFoundException quando o ícone não existe", async () => {
            mockPrismaService.icone.findUnique.mockResolvedValue(null);

            await expect(service.create(etapaFabrico1, gerenteFabrico1)).rejects.toThrow(
                NotFoundException,
            );
            expect(mockPrismaService.etapa.create).not.toHaveBeenCalled();
        });

        it("traduz conflito de unicidade do Prisma", async () => {
            mockPrismaService.icone.findUnique.mockResolvedValue({ id: 99 });
            mockPrismaService.etapa.create.mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError("Erro", {
                    code: "P2002",
                    clientVersion: "7.x",
                }),
            );

            await expect(service.create(etapaFabrico1, gerenteFabrico1)).rejects.toThrow(
                ConflictException,
            );
        });
    });

    describe("findAllByFabricoID", () => {
        it("lista somente etapas do fabrico informado em ordem produtiva", async () => {
            mockPrismaService.etapa.findMany.mockResolvedValue([etapaFabrico1]);

            const resultado = await service.findAllByFabricoID(1, gerenteFabrico1);

            expect(resultado).toEqual([etapaFabrico1]);
            expect(resultado).not.toContain(etapaFabrico2);
            expect(mockPrismaService.etapa.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 1 },
                orderBy: { ordem: "asc" },
                include: { icone: true, icone_verde: true, icone_cinza: true },
            });
        });

        it("rejeita listagem de um fabrico diferente para usuário tenant", async () => {
            await expect(service.findAllByFabricoID(2, gerenteFabrico1)).rejects.toThrow(
                BadRequestException,
            );
            expect(mockPrismaService.etapa.findMany).not.toHaveBeenCalled();
        });

        it("permite que admin liste as etapas de um fabrico específico", async () => {
            mockPrismaService.etapa.findMany.mockResolvedValue([etapaFabrico2]);

            await expect(service.findAllByFabricoID(2, admin)).resolves.toEqual([etapaFabrico2]);
            expect(mockPrismaService.etapa.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 2 },
                orderBy: { ordem: "asc" },
                include: { icone: true, icone_verde: true, icone_cinza: true },
            });
        });
    });

    describe("findAllForAuthenticatedUser", () => {
        it("isola a listagem entre os fabricos dos usuários autenticados", async () => {
            mockPrismaService.etapa.findMany.mockImplementation(({ where }) =>
                Promise.resolve(where.fabrico_id === 1 ? [etapaFabrico1] : [etapaFabrico2]),
            );

            await expect(service.findAllForAuthenticatedUser(gerenteFabrico1)).resolves.toEqual([
                etapaFabrico1,
            ]);
            await expect(service.findAllForAuthenticatedUser(gerenteFabrico2)).resolves.toEqual([
                etapaFabrico2,
            ]);
            expect(mockPrismaService.etapa.findMany).toHaveBeenNthCalledWith(1, {
                where: { fabrico_id: 1 },
                orderBy: { ordem: "asc" },
                include: { icone: true, icone_verde: true, icone_cinza: true },
            });
            expect(mockPrismaService.etapa.findMany).toHaveBeenNthCalledWith(2, {
                where: { fabrico_id: 2 },
                orderBy: { ordem: "asc" },
                include: { icone: true, icone_verde: true, icone_cinza: true },
            });
        });

        it("exige que administradores usem a consulta com fabrico explícito", async () => {
            await expect(service.findAllForAuthenticatedUser(admin)).rejects.toThrow(
                BadRequestException,
            );
            expect(mockPrismaService.etapa.findMany).not.toHaveBeenCalled();
        });
    });

    describe("getById", () => {
        it("busca etapa por id dentro do fabrico autenticado", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(etapaFabrico1);

            await expect(service.getById(1, gerenteFabrico1)).resolves.toEqual(etapaFabrico1);
            expect(mockPrismaService.etapa.findFirst).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: 1 },
            });
        });

        it("retorna 404 ao consultar etapa de outro tenant", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(null);

            await expect(service.getById(2, gerenteFabrico1)).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.etapa.findFirst).toHaveBeenCalledWith({
                where: { id: 2, fabrico_id: 1 },
            });
        });

        it("permite que admin consulte uma etapa pelo id", async () => {
            mockPrismaService.etapa.findUnique.mockResolvedValue(etapaFabrico2);

            await expect(service.getById(2, admin)).resolves.toEqual(etapaFabrico2);
            expect(mockPrismaService.etapa.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
        });
    });

    describe("update", () => {
        it("atualiza somente etapa pertencente ao fabrico autenticado", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(etapaFabrico1);
            mockPrismaService.etapa.update.mockResolvedValue({ ...etapaFabrico1, nome: "Corte" });

            const resultado = await service.update(1, { nome: "Corte" }, gerenteFabrico1);

            expect(resultado.nome).toBe("Corte");
            expect(mockPrismaService.etapa.findFirst).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: 1 },
            });
            expect(mockPrismaService.etapa.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { nome: "Corte" },
            });
        });

        it("rejeita tentativa de alterar fabrico_id", async () => {
            await expect(service.update(1, { fabrico_id: 2 }, gerenteFabrico1)).rejects.toThrow(
                BadRequestException,
            );
            expect(mockPrismaService.etapa.update).not.toHaveBeenCalled();
        });

        it("retorna 404 ao alterar etapa de outro tenant", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(null);

            await expect(service.update(2, { nome: "Corte" }, gerenteFabrico1)).rejects.toThrow(
                NotFoundException,
            );
            expect(mockPrismaService.etapa.update).not.toHaveBeenCalled();
        });

        it("permite que admin atualize uma etapa quando informa o fabrico no body", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(etapaFabrico2);
            mockPrismaService.etapa.update.mockResolvedValue({ ...etapaFabrico2, nome: "Corte" });

            await expect(
                service.update(2, { nome: "Corte", fabrico_id: 2 }, admin),
            ).resolves.toEqual({ ...etapaFabrico2, nome: "Corte" });
            expect(mockPrismaService.etapa.findFirst).toHaveBeenCalledWith({
                where: { id: 2, fabrico_id: 2 },
            });
            expect(mockPrismaService.etapa.update).toHaveBeenCalledWith({
                where: { id: 2 },
                data: { nome: "Corte" },
            });
        });

        it("rejeita update por admin sem fabrico informado", async () => {
            await expect(service.update(2, { nome: "Corte" }, admin)).rejects.toThrow(
                BadRequestException,
            );
            expect(mockPrismaService.etapa.update).not.toHaveBeenCalled();
        });
    });

    describe("ordem única entre etapas ativas", () => {
        const MENSAGEM = "Já existe outra etapa ativa com esta ordem neste fabrico";
        // Formato real do Prisma 7 com o adaptador pg: o campo violado vem em driverAdapterError.
        const erroUnico = (campos: string[]) =>
            new Prisma.PrismaClientKnownRequestError("Erro", {
                code: "P2002",
                clientVersion: "7.x",
                meta: {
                    modelName: "Etapa",
                    driverAdapterError: {
                        name: "DriverAdapterError",
                        cause: {
                            originalCode: "23505",
                            kind: "UniqueConstraintViolation",
                            constraint: { fields: campos },
                        },
                    },
                },
            });
        const erroOrdemUnica = () => erroUnico(["fabrico_id", "ordem"]);

        describe("create", () => {
            it("rejeita com 409 ordem já usada por outra etapa ativa do mesmo fabrico, sem gravar", async () => {
                mockPrismaService.etapa.count.mockResolvedValue(1);

                await expect(
                    service.create({ nome: "Corte", ordem: 3 }, gerenteFabrico1),
                ).rejects.toThrow(new ConflictException(MENSAGEM));
                expect(mockPrismaService.etapa.count).toHaveBeenCalledWith({
                    where: { fabrico_id: 1, ativa: true, ordem: 3 },
                });
                expect(mockPrismaService.etapa.create).not.toHaveBeenCalled();
                expect(mockProdutoService.recalcularCustosTotais).not.toHaveBeenCalled();
            });

            it("aceita a ordem quando nenhuma etapa ativa do fabrico a usa", async () => {
                mockPrismaService.etapa.create.mockResolvedValue(etapaFabrico1);

                await expect(
                    service.create({ nome: "Corte", ordem: 3 }, gerenteFabrico1),
                ).resolves.toEqual(etapaFabrico1);
                expect(mockPrismaService.etapa.create).toHaveBeenCalledTimes(1);
            });

            it("só compara com etapas do próprio fabrico: outra fábrica pode usar a mesma ordem", async () => {
                mockPrismaService.etapa.create.mockResolvedValue(etapaFabrico2);

                await service.create({ nome: "Corte", ordem: 1 }, gerenteFabrico2);

                expect(mockPrismaService.etapa.count).toHaveBeenCalledWith({
                    where: { fabrico_id: 2, ativa: true, ordem: 1 },
                });
            });

            it("não valida a ordem de uma etapa criada já inativa", async () => {
                mockPrismaService.etapa.count.mockResolvedValue(1);
                mockPrismaService.etapa.create.mockResolvedValue(etapaFabrico1);

                await service.create({ nome: "Corte", ordem: 3, ativa: false }, gerenteFabrico1);

                expect(mockPrismaService.etapa.count).not.toHaveBeenCalled();
                expect(mockPrismaService.etapa.create).toHaveBeenCalledTimes(1);
            });

            it("traduz a violação do índice único parcial (corrida) como conflito de ordem", async () => {
                mockPrismaService.etapa.create.mockRejectedValue(erroOrdemUnica());

                await expect(
                    service.create({ nome: "Corte", ordem: 3 }, gerenteFabrico1),
                ).rejects.toThrow(new ConflictException(MENSAGEM));
            });

            it("também reconhece o formato legado do erro (meta.target)", async () => {
                mockPrismaService.etapa.create.mockRejectedValue(
                    new Prisma.PrismaClientKnownRequestError("Erro", {
                        code: "P2002",
                        clientVersion: "7.x",
                        meta: { target: ["fabrico_id", "ordem"] },
                    }),
                );

                await expect(
                    service.create({ nome: "Corte", ordem: 3 }, gerenteFabrico1),
                ).rejects.toThrow(new ConflictException(MENSAGEM));
            });

            it("mantém a mensagem de nome duplicado quando o conflito é do nome", async () => {
                mockPrismaService.etapa.create.mockRejectedValue(erroUnico(["fabrico_id", "nome"]));

                await expect(
                    service.create({ nome: "Corte", ordem: 3 }, gerenteFabrico1),
                ).rejects.toThrow(new ConflictException("Etapa já cadastrada"));
            });
        });

        describe("update", () => {
            beforeEach(() => {
                mockPrismaService.etapa.findFirst.mockResolvedValue(etapaFabrico1);
                mockPrismaService.etapa.update.mockResolvedValue(etapaFabrico1);
            });

            it("rejeita com 409 mudar para a ordem de outra etapa ativa, sem gravar", async () => {
                mockPrismaService.etapa.count.mockResolvedValue(1);

                await expect(service.update(1, { ordem: 4 }, gerenteFabrico1)).rejects.toThrow(
                    new ConflictException(MENSAGEM),
                );
                expect(mockPrismaService.etapa.count).toHaveBeenCalledWith({
                    where: { fabrico_id: 1, ativa: true, ordem: 4, id: { not: 1 } },
                });
                expect(mockPrismaService.etapa.update).not.toHaveBeenCalled();
            });

            it("aceita mudar para uma ordem livre", async () => {
                await expect(service.update(1, { ordem: 4 }, gerenteFabrico1)).resolves.toEqual(
                    etapaFabrico1,
                );
                expect(mockPrismaService.etapa.update).toHaveBeenCalledTimes(1);
            });

            it("rejeita reativar uma etapa cuja ordem foi assumida por outra etapa ativa", async () => {
                mockPrismaService.etapa.findFirst.mockResolvedValue({
                    ...etapaFabrico1,
                    ativa: false,
                });
                mockPrismaService.etapa.count.mockResolvedValue(1);

                await expect(service.update(1, { ativa: true }, gerenteFabrico1)).rejects.toThrow(
                    new ConflictException(MENSAGEM),
                );
                expect(mockPrismaService.etapa.count).toHaveBeenCalledWith({
                    where: { fabrico_id: 1, ativa: true, ordem: 1, id: { not: 1 } },
                });
                expect(mockPrismaService.etapa.update).not.toHaveBeenCalled();
            });

            it("não valida a ordem ao desativar uma etapa", async () => {
                mockPrismaService.etapa.count.mockResolvedValue(1);

                await service.update(1, { ativa: false }, gerenteFabrico1);

                expect(mockPrismaService.etapa.count).not.toHaveBeenCalled();
                expect(mockPrismaService.etapa.update).toHaveBeenCalledTimes(1);
            });

            it("etapa inativa pode mudar de ordem mesmo que a ordem exista numa etapa ativa", async () => {
                mockPrismaService.etapa.findFirst.mockResolvedValue({
                    ...etapaFabrico1,
                    ativa: false,
                });
                mockPrismaService.etapa.count.mockResolvedValue(1);

                await service.update(1, { ordem: 4 }, gerenteFabrico1);

                expect(mockPrismaService.etapa.count).not.toHaveBeenCalled();
                expect(mockPrismaService.etapa.update).toHaveBeenCalledTimes(1);
            });

            it("não valida a ordem quando nem a ordem nem o estado mudam", async () => {
                mockPrismaService.etapa.count.mockResolvedValue(1);

                await service.update(1, { nome: "Corte" }, gerenteFabrico1);
                await service.update(1, { ordem: 1, ativa: true }, gerenteFabrico1);

                expect(mockPrismaService.etapa.count).not.toHaveBeenCalled();
                expect(mockPrismaService.etapa.update).toHaveBeenCalledTimes(2);
            });

            it("traduz a violação do índice único parcial (corrida) como conflito de ordem", async () => {
                mockPrismaService.etapa.update.mockRejectedValue(erroOrdemUnica());

                await expect(service.update(1, { ordem: 4 }, gerenteFabrico1)).rejects.toThrow(
                    new ConflictException(MENSAGEM),
                );
            });
        });
    });

    describe("delete", () => {
        it("exclui somente etapa pertencente ao fabrico autenticado", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(etapaFabrico1);
            mockPrismaService.etapa.delete.mockResolvedValue(etapaFabrico1);

            await expect(service.delete(1, gerenteFabrico1)).resolves.toEqual(etapaFabrico1);
            expect(mockPrismaService.etapa.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("retorna 404 ao excluir etapa de outro tenant", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(null);

            await expect(service.delete(2, gerenteFabrico1)).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.etapa.delete).not.toHaveBeenCalled();
        });

        it("permite que admin exclua uma etapa identificada pelo id", async () => {
            mockPrismaService.etapa.findUnique.mockResolvedValue(etapaFabrico2);
            mockPrismaService.etapa.delete.mockResolvedValue(etapaFabrico2);

            await expect(service.delete(2, admin)).resolves.toEqual(etapaFabrico2);
            expect(mockPrismaService.etapa.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
            expect(mockPrismaService.etapa.delete).toHaveBeenCalledWith({ where: { id: 2 } });
        });
    });

    describe("quando a última etapa ativa muda (produzida_em)", () => {
        const ultimaEtapaId = 9;
        const carimbo = (fabricoId: number) => ({
            where: {
                delete_at: null,
                fabrico_id: fabricoId,
                concluida: false,
                etapa_atual_id: ultimaEtapaId,
                produzida_em: null,
            },
            data: { produzida_em: expect.any(Date) },
        });

        // A consulta da última etapa é a única com orderBy; getById usa só id e fabrico.
        const ultimaEtapaAtiva = (resultado: { id: number } | null = { id: ultimaEtapaId }) =>
            mockPrismaService.etapa.findFirst.mockImplementation(
                ({ orderBy }: { orderBy?: unknown }) =>
                    Promise.resolve(orderBy ? resultado : etapaFabrico1),
            );

        beforeEach(() => {
            mockPrismaService.icone.findUnique.mockResolvedValue({ id: 99 });
            mockPrismaService.etapa.create.mockResolvedValue(etapaFabrico1);
            mockPrismaService.etapa.update.mockResolvedValue(etapaFabrico1);
            mockPrismaService.etapa.delete.mockResolvedValue(etapaFabrico1);
            ultimaEtapaAtiva();
        });

        it("etapa ativa criada: carimba as fichas abertas da nova última etapa, só do próprio fabrico", async () => {
            await service.create({ ...etapaFabrico1, fabrico_id: undefined }, gerenteFabrico1);

            expect(mockPrismaService.etapa.findFirst).toHaveBeenCalledWith({
                where: { fabrico_id: 1, ativa: true },
                orderBy: { ordem: "desc" },
                select: { id: true },
            });
            expect(mockPrismaService.fichaTecnica.updateMany).toHaveBeenCalledTimes(1);
            expect(mockPrismaService.fichaTecnica.updateMany).toHaveBeenCalledWith(carimbo(1));
        });

        it("só marca quem ainda não tem produzida_em: o carimbo existente nunca é limpo nem regravado", async () => {
            await service.create({ ...etapaFabrico1, fabrico_id: undefined }, gerenteFabrico1);

            const { where, data } = mockPrismaService.fichaTecnica.updateMany.mock.calls[0][0];
            expect(where.produzida_em).toBeNull();
            expect(where.concluida).toBe(false);
            expect(Object.keys(data)).toEqual(["produzida_em"]);
        });

        it("etapa criada já inativa não pode ser a última: não carimba", async () => {
            mockPrismaService.etapa.create.mockResolvedValue({ ...etapaFabrico1, ativa: false });

            await service.create(
                { ...etapaFabrico1, ativa: false, fabrico_id: undefined },
                gerenteFabrico1,
            );

            expect(mockPrismaService.fichaTecnica.updateMany).not.toHaveBeenCalled();
        });

        it.each([
            ["mudar a ordem", { ordem: 7 }],
            ["desativar a etapa", { ativa: false }],
        ])("update ao %s recalcula a última etapa e carimba", async (_nome, dto) => {
            await service.update(1, dto, gerenteFabrico1);

            expect(mockPrismaService.fichaTecnica.updateMany).toHaveBeenCalledWith(carimbo(1));
        });

        it("reativar uma etapa também recalcula a última etapa", async () => {
            mockPrismaService.etapa.findFirst.mockImplementation(
                ({ orderBy }: { orderBy?: unknown }) =>
                    Promise.resolve(
                        orderBy ? { id: ultimaEtapaId } : { ...etapaFabrico1, ativa: false },
                    ),
            );

            await service.update(1, { ativa: true }, gerenteFabrico1);

            expect(mockPrismaService.fichaTecnica.updateMany).toHaveBeenCalledWith(carimbo(1));
        });

        it("update que não muda ordem nem ativa não toca nas fichas", async () => {
            await service.update(1, { nome: "Corte" }, gerenteFabrico1);
            await service.update(1, { ordem: 1, ativa: true }, gerenteFabrico1);

            expect(mockPrismaService.fichaTecnica.updateMany).not.toHaveBeenCalled();
        });

        it("update por admin carimba no fabrico da etapa alterada", async () => {
            mockPrismaService.etapa.findUnique.mockResolvedValue(etapaFabrico2);
            mockPrismaService.etapa.findFirst.mockImplementation(
                ({ orderBy }: { orderBy?: unknown }) =>
                    Promise.resolve(orderBy ? { id: ultimaEtapaId } : etapaFabrico2),
            );

            await service.update(2, { fabrico_id: 2, ordem: 5 }, admin);

            expect(mockPrismaService.etapa.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({ where: { fabrico_id: 2, ativa: true } }),
            );
            expect(mockPrismaService.fichaTecnica.updateMany).toHaveBeenCalledWith(carimbo(2));
        });

        it("excluir uma etapa ativa recalcula a última etapa e carimba", async () => {
            await service.delete(1, gerenteFabrico1);

            expect(mockPrismaService.fichaTecnica.updateMany).toHaveBeenCalledWith(carimbo(1));
        });

        it("excluir uma etapa inativa não muda a última etapa: não carimba", async () => {
            mockPrismaService.etapa.delete.mockResolvedValue({ ...etapaFabrico1, ativa: false });

            await service.delete(1, gerenteFabrico1);

            expect(mockPrismaService.fichaTecnica.updateMany).not.toHaveBeenCalled();
        });

        it("fábrica sem nenhuma etapa ativa depois da mudança: não carimba ninguém", async () => {
            ultimaEtapaAtiva(null);

            await service.update(1, { ativa: false }, gerenteFabrico1);

            expect(mockPrismaService.fichaTecnica.updateMany).not.toHaveBeenCalled();
        });

        it("propaga a falha do carimbo antes de recalcular os custos (mesma transação)", async () => {
            mockPrismaService.fichaTecnica.updateMany.mockRejectedValueOnce(new Error("falha"));

            await expect(service.update(1, { ordem: 7 }, gerenteFabrico1)).rejects.toThrow("falha");
            expect(mockProdutoService.recalcularCustosTotais).not.toHaveBeenCalled();
        });
    });
});
