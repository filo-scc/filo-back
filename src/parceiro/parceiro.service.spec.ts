import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { EnderecoService } from "../endereco/endereco.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";
import { ParceiroService } from "./parceiro.service";

describe("ParceiroService", () => {
    let service: ParceiroService;
    let prisma: PrismaService;
    let enderecoService: EnderecoService;
    let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

    const userFabrico1: AuthenticatedUser = {
        id: 1,
        email: "gerente@filo.test",
        nome: "Gerente",
        foto_de_perfil: null,
        cargo: "GERENTE",
        fabrico_id: 1,
        fabrico: { id: 1, ativo: true },
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

    const mockPrismaService = {
        parceiro: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        etapa: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    const mockEnderecoService = {
        create: jest.fn(),
        update: jest.fn(),
    };

    const mockProdutoService = {
        bloquearProdutosParaRecalculo: jest.fn(),
        recalcularCustosTotais: jest.fn(),
    };

    const mockParceiro = {
        id: 1,
        nome: "Parceiro Teste",
        fabrico_id: 1,
        responsavel: "Thiago",
        telefone: "11999999999",
        etapa_id: null,
        etapa: null,
        endereco: { id: 10, rua: "Rua T" },
        parceiro_produto: [],
    };

    function dadosGravados(escrita: { mock: { calls: any[][] } }): Record<string, unknown> {
        return escrita.mock.calls[0][0].data;
    }

    const etapaCostura = { id: 5, nome: "Costura", ativa: true };
    const etapaInativa = { id: 6, nome: "Acabamento", ativa: false };

    beforeEach(async () => {
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
        mockPrismaService.$transaction.mockImplementation((callback: any) =>
            callback(mockPrismaService),
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ParceiroService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: EnderecoService, useValue: mockEnderecoService },
                { provide: ProdutoService, useValue: mockProdutoService },
            ],
        }).compile();

        service = module.get<ParceiroService>(ParceiroService);
        prisma = module.get<PrismaService>(PrismaService);
        enderecoService = module.get<EnderecoService>(EnderecoService);

        jest.clearAllMocks();
        mockPrismaService.etapa.findFirst.mockReset();
        mockPrismaService.etapa.findMany.mockReset();
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("deve estar definido", () => {
        expect(service).toBeDefined();
    });

    describe("getAll()", () => {
        it("deve retornar apenas parceiros do fabrico autenticado", async () => {
            mockPrismaService.parceiro.findMany.mockResolvedValue([mockParceiro]);

            const result = await service.getAll(userFabrico1);

            expect(result).toEqual([mockParceiro]);
            expect(prisma.parceiro.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 1 },
                include: {
                    endereco: true,
                    etapa: { select: { id: true, nome: true, ativa: true } },
                    parceiro_produto: { include: { produto: true } },
                },
            });
        });

        it("deve recusar ADMIN para nao abrir consulta global implicita", async () => {
            await expect(service.getAll(admin)).rejects.toThrow(ForbiddenException);
            expect(prisma.parceiro.findMany).not.toHaveBeenCalled();
        });

        it("deve lancar NotFoundException caso tenha falha na consulta", async () => {
            mockPrismaService.parceiro.findMany.mockRejectedValue(new Error("falha"));

            await expect(service.getAll(userFabrico1)).rejects.toThrow(NotFoundException);
        });
    });

    describe("getById()", () => {
        it("deve retornar parceiro do fabrico autenticado", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(mockParceiro);

            const result = await service.getById(1, userFabrico1);

            expect(result).toEqual(mockParceiro);
            expect(prisma.parceiro.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 1, fabrico_id: 1 } }),
            );
        });

        it("deve retornar 404 para parceiro de outro fabrico", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);

            await expect(service.getById(99, userFabrico1)).rejects.toThrow(NotFoundException);
        });
    });

    describe("create()", () => {
        const createDto = {
            nome: "Novo parceiro",
            telefone: "81900000000",
            endereco: { rua: "Rua H", cep: "50000000" },
        };

        it("deve criar usando o fabrico autenticado", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);
            mockEnderecoService.create.mockResolvedValue({ id: 20 });
            mockPrismaService.parceiro.create.mockResolvedValue({ id: 2, ...createDto });

            const result = await service.create(createDto, userFabrico1);

            expect(result).toEqual({ message: "Parceiro criado com sucesso" });
            expect(enderecoService.create).toHaveBeenCalledWith(createDto.endereco);
            expect(prisma.parceiro.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    nome: "Novo parceiro",
                    fabrico_id: 1,
                    endereco: { connect: { id: 20 } },
                }),
                include: { endereco: true },
            });
        });

        it("deve vincular o parceiro pela etapa_id", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);
            mockPrismaService.etapa.findFirst.mockResolvedValue(etapaCostura);
            mockEnderecoService.create.mockResolvedValue({ id: 20 });
            mockPrismaService.parceiro.create.mockResolvedValue({ id: 2 });

            await service.create({ ...createDto, etapa_id: 5 }, userFabrico1);

            expect(prisma.etapa.findFirst).toHaveBeenCalledWith({
                where: { id: 5, fabrico_id: 1 },
                select: { id: true, ativa: true },
            });
            expect(dadosGravados(mockPrismaService.parceiro.create).etapa_id).toBe(5);
        });

        it("deve recusar etapa_id de outro fabrico sem criar endereco nem parceiro", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);
            mockPrismaService.etapa.findFirst.mockResolvedValue(null);

            await expect(
                service.create({ ...createDto, etapa_id: 99 }, userFabrico1),
            ).rejects.toThrow(new BadRequestException("Etapa inválida"));
            expect(enderecoService.create).not.toHaveBeenCalled();
            expect(prisma.parceiro.create).not.toHaveBeenCalled();
        });

        it("deve recusar vínculo novo com etapa inativa", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);
            mockPrismaService.etapa.findFirst.mockResolvedValue(etapaInativa);

            await expect(
                service.create({ ...createDto, etapa_id: 6 }, userFabrico1),
            ).rejects.toThrow(BadRequestException);
            expect(prisma.parceiro.create).not.toHaveBeenCalled();
        });

        it("deve criar sem etapa quando etapa_id nao e informado", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);
            mockEnderecoService.create.mockResolvedValue({ id: 20 });
            mockPrismaService.parceiro.create.mockResolvedValue({ id: 2 });

            await service.create(createDto, userFabrico1);

            expect(prisma.etapa.findFirst).not.toHaveBeenCalled();
            expect(dadosGravados(mockPrismaService.parceiro.create)).not.toHaveProperty("etapa_id");
        });

        it("deve rejeitar fabrico_id no payload", async () => {
            await expect(
                service.create({ ...createDto, fabrico_id: 99 } as any, userFabrico1),
            ).rejects.toThrow(BadRequestException);
            expect(prisma.parceiro.create).not.toHaveBeenCalled();
        });

        it("deve impedir nome duplicado no mesmo fabrico", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(mockParceiro);

            await expect(service.create(createDto, userFabrico1)).rejects.toThrow(
                ConflictException,
            );
            expect(enderecoService.create).not.toHaveBeenCalled();
            expect(prisma.parceiro.create).not.toHaveBeenCalled();
        });
    });

    describe("update()", () => {
        const updateDto = {
            nome: "Parceiro Atualizado",
            endereco: { rua: "I" },
        };

        it("deve atualizar parceiro do proprio fabrico", async () => {
            mockPrismaService.parceiro.findFirst
                .mockResolvedValueOnce(mockParceiro)
                .mockResolvedValueOnce(null);
            mockEnderecoService.update.mockResolvedValue({});
            mockPrismaService.parceiro.update.mockResolvedValue({
                ...mockParceiro,
                nome: "Parceiro Atualizado",
            });

            const result = await service.update(1, updateDto, userFabrico1);

            expect(result).toEqual({ message: "Parceiro atualizado com sucesso" });
            expect(enderecoService.update).toHaveBeenCalledWith(10, updateDto.endereco);
            expect(prisma.parceiro.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({ nome: "Parceiro Atualizado" }),
            });
        });

        describe("vínculo com a etapa", () => {
            const parceiroNaCostura = {
                ...mockParceiro,
                etapa_id: 5,
                etapa: etapaCostura,
            };

            function dadosDoUpdate() {
                return dadosGravados(mockPrismaService.parceiro.update);
            }

            beforeEach(() => {
                mockPrismaService.parceiro.update.mockResolvedValue({});
            });

            it("deve trocar de etapa por etapa_id e recalcular os produtos", async () => {
                mockPrismaService.parceiro.findFirst.mockResolvedValue({
                    ...parceiroNaCostura,
                    parceiro_produto: [{ produto_id: 3 }],
                });
                mockPrismaService.etapa.findFirst.mockResolvedValue({ id: 8, ativa: true });

                await service.update(1, { etapa_id: 8 }, userFabrico1);

                expect(prisma.etapa.findFirst).toHaveBeenCalledWith({
                    where: { id: 8, fabrico_id: 1 },
                    select: { id: true, ativa: true },
                });
                expect(dadosDoUpdate()).toEqual({ etapa_id: 8 });
                expect(mockProdutoService.recalcularCustosTotais).toHaveBeenCalledWith(
                    [3],
                    mockPrismaService,
                );
            });

            it("deve recusar etapa_id de outro fabrico sem alterar o parceiro", async () => {
                mockPrismaService.parceiro.findFirst.mockResolvedValue(parceiroNaCostura);
                mockPrismaService.etapa.findFirst.mockResolvedValue(null);

                await expect(service.update(1, { etapa_id: 99 }, userFabrico1)).rejects.toThrow(
                    new BadRequestException("Etapa inválida"),
                );
                expect(prisma.parceiro.update).not.toHaveBeenCalled();
            });

            it("deve remover o vínculo quando etapa_id é null", async () => {
                mockPrismaService.parceiro.findFirst.mockResolvedValue(parceiroNaCostura);

                await service.update(1, { etapa_id: null }, userFabrico1);

                expect(dadosDoUpdate()).toEqual({ etapa_id: null });
                expect(prisma.etapa.findFirst).not.toHaveBeenCalled();
            });

            it("deve manter o vínculo quando etapa_id foi omitido", async () => {
                mockPrismaService.parceiro.findFirst.mockResolvedValue(parceiroNaCostura);

                await service.update(1, { telefone: "11111111111" }, userFabrico1);

                expect(dadosDoUpdate()).toEqual({ telefone: "11111111111" });
            });

            it("deve recusar troca para etapa inativa, mas aceitar reenviar a etapa inativa atual", async () => {
                mockPrismaService.parceiro.findFirst.mockResolvedValue({
                    ...mockParceiro,
                    etapa_id: 6,
                    etapa: etapaInativa,
                });
                mockPrismaService.etapa.findFirst.mockResolvedValue(etapaInativa);

                await service.update(1, { etapa_id: 6 }, userFabrico1);
                expect(dadosDoUpdate()).toEqual({ etapa_id: 6 });

                mockPrismaService.parceiro.findFirst.mockResolvedValue(parceiroNaCostura);
                await expect(service.update(1, { etapa_id: 6 }, userFabrico1)).rejects.toThrow(
                    BadRequestException,
                );
            });
        });

        it("deve impedir fabrico_id no update", async () => {
            await expect(service.update(1, { fabrico_id: 2 } as any, userFabrico1)).rejects.toThrow(
                BadRequestException,
            );
            expect(prisma.parceiro.update).not.toHaveBeenCalled();
        });

        it("deve rejeitar update em parceiro de outro fabrico", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);

            await expect(
                service.update(1, { telefone: "11111111111" }, userFabrico1),
            ).rejects.toThrow(NotFoundException);
            expect(prisma.parceiro.update).not.toHaveBeenCalled();
        });

        it("deve lancar ConflictException para nome ja existente", async () => {
            mockPrismaService.parceiro.findFirst
                .mockResolvedValueOnce(mockParceiro)
                .mockResolvedValueOnce({ id: 2, nome: "Parceiro Atualizado" });

            await expect(service.update(1, updateDto, userFabrico1)).rejects.toThrow(
                ConflictException,
            );
            expect(prisma.parceiro.update).not.toHaveBeenCalled();
        });

        it("deve exigir endereco existente ao atualizar endereco", async () => {
            mockPrismaService.parceiro.findFirst
                .mockResolvedValueOnce({ ...mockParceiro, endereco: null })
                .mockResolvedValueOnce(null);

            await expect(service.update(1, updateDto, userFabrico1)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe("delete()", () => {
        it("deve excluir parceiro do proprio fabrico", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(mockParceiro);
            mockPrismaService.parceiro.delete.mockResolvedValue(mockParceiro);

            const result = await service.delete(1, userFabrico1);

            expect(result).toEqual({ message: "Parceiro foi removido com sucesso" });
            expect(prisma.parceiro.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("deve retornar 404 ao excluir parceiro de outro fabrico", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);

            await expect(service.delete(99, userFabrico1)).rejects.toThrow(NotFoundException);
            expect(prisma.parceiro.delete).not.toHaveBeenCalled();
        });
    });

    describe("getParceirosByEtapa()", () => {
        it("deve filtrar por etapa_id dentro do tenant autenticado", async () => {
            mockPrismaService.parceiro.findMany.mockResolvedValue([mockParceiro]);

            const result = await service.getParceirosByEtapa(5, userFabrico1);

            expect(result).toEqual([mockParceiro]);
            expect(prisma.parceiro.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 1, etapa_id: 5 },
                include: { etapa: { select: { id: true, nome: true, ativa: true } } },
            });
        });

        it("deve recusar ADMIN sem escopo", async () => {
            await expect(service.getParceirosByEtapa(5, admin)).rejects.toThrow(ForbiddenException);
            expect(prisma.parceiro.findMany).not.toHaveBeenCalled();
        });
    });
});
