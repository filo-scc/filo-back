import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { EnderecoService } from "../endereco/endereco.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";
import { ParceiroService } from "./parceiro.service";

describe("ParceiroService", () => {
    let service: ParceiroService;
    let prisma: PrismaService;
    let enderecoService: EnderecoService;
    let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

    const mockPrismaService = {
        parceiro: {
            findMany: jest.fn<any>(),
            findUnique: jest.fn<any>(),
            findFirst: jest.fn<any>(),
            create: jest.fn<any>(),
            update: jest.fn<any>(),
            delete: jest.fn<any>(),
        },
        $transaction: jest.fn<any>(),
    };

    const mockEnderecoService = {
        create: jest.fn<any>(),
        update: jest.fn<any>(),
    };

    const mockProdutoService = {
        bloquearProdutosParaRecalculo: jest.fn<any>(),
        recalcularCustosTotais: jest.fn<any>(),
    };

    const mockParceiro = {
        id: 1,
        nome: "Parceiro Teste",
        fabrico_id: 1,
        responsavel: "Thiago",
        telefone: "11999999999",
        endereco: { id: 10, rua: "Rua T" },
        parceiro_produto: [],
    };

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

            const result = await service.getAll(1);

            expect(result).toEqual([mockParceiro]);
            expect(prisma.parceiro.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 1 },
                include: {
                    endereco: true,
                    parceiro_produto: { include: { produto: true } },
                },
            });
        });

        it("deve lancar NotFoundException caso tenha falha na consulta", async () => {
            mockPrismaService.parceiro.findMany.mockRejectedValue(new Error("falha"));

            await expect(service.getAll(1)).rejects.toThrow(NotFoundException);
        });
    });

    describe("getAllparceiroByFabrico()", () => {
        it("deve retornar parceiros de um fabrico", async () => {
            mockPrismaService.parceiro.findMany.mockResolvedValue([mockParceiro]);

            const result = await service.getAllparceiroByFabrico(1);

            expect(result).toEqual([mockParceiro]);
            expect(prisma.parceiro.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { fabrico_id: 1 } }),
            );
        });
    });

    describe("getById()", () => {
        it("deve retornar parceiro do fabrico autenticado", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(mockParceiro);

            const result = await service.getById(1, 1);

            expect(result).toEqual(mockParceiro);
            expect(prisma.parceiro.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 1, fabrico_id: 1 } }),
            );
        });

        it("deve retornar 404 para parceiro de outro fabrico", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);

            await expect(service.getById(99, 1)).rejects.toThrow(NotFoundException);
        });
    });

    describe("create()", () => {
        const createDto: any = {
            nome: "Novo parceiro",
            fabrico_id: 99,
            telefone: "81900000000",
            endereco: { rua: "Rua H", cep: "50000000" },
        };

        it("deve criar usando o fabrico autenticado", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);
            mockEnderecoService.create.mockResolvedValue({ id: 20 });
            mockPrismaService.parceiro.create.mockResolvedValue({ id: 2, ...createDto });

            const result = await service.create(createDto, 1);

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

        it("deve impedir nome duplicado no mesmo fabrico", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(mockParceiro);

            await expect(service.create(createDto, 1)).rejects.toThrow(ConflictException);
            expect(enderecoService.create).not.toHaveBeenCalled();
            expect(prisma.parceiro.create).not.toHaveBeenCalled();
        });
    });

    describe("update()", () => {
        const updateDto: any = {
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

            const result = await service.update(1, updateDto, 1);

            expect(result).toEqual({ message: "Parceiro atualizado com sucesso" });
            expect(enderecoService.update).toHaveBeenCalledWith(10, updateDto.endereco);
            expect(prisma.parceiro.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({ nome: "Parceiro Atualizado" }),
            });
        });

        it("deve impedir troca de fabrico", async () => {
            await expect(service.update(1, { fabrico_id: 2 } as any, 1)).rejects.toThrow(
                BadRequestException,
            );
            expect(prisma.parceiro.update).not.toHaveBeenCalled();
        });

        it("deve rejeitar update em parceiro de outro fabrico", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);

            await expect(service.update(1, { telefone: "11111111111" }, 1)).rejects.toThrow(
                NotFoundException,
            );
            expect(prisma.parceiro.update).not.toHaveBeenCalled();
        });

        it("deve lancar ConflictException para nome ja existente", async () => {
            mockPrismaService.parceiro.findFirst
                .mockResolvedValueOnce(mockParceiro)
                .mockResolvedValueOnce({ id: 2, nome: "Parceiro Atualizado" });

            await expect(service.update(1, updateDto, 1)).rejects.toThrow(ConflictException);
            expect(prisma.parceiro.update).not.toHaveBeenCalled();
        });

        it("deve exigir endereco existente ao atualizar endereco", async () => {
            mockPrismaService.parceiro.findFirst
                .mockResolvedValueOnce({ ...mockParceiro, endereco: null })
                .mockResolvedValueOnce(null);

            await expect(service.update(1, updateDto, 1)).rejects.toThrow(NotFoundException);
        });
    });

    describe("delete()", () => {
        it("deve excluir parceiro do proprio fabrico", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(mockParceiro);
            mockPrismaService.parceiro.delete.mockResolvedValue(mockParceiro);

            const result = await service.delete(1, 1);

            expect(result).toEqual({ message: "Parceiro foi removido com sucesso" });
            expect(prisma.parceiro.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("deve retornar 404 ao excluir parceiro de outro fabrico", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);

            await expect(service.delete(99, 1)).rejects.toThrow(NotFoundException);
            expect(prisma.parceiro.delete).not.toHaveBeenCalled();
        });
    });

    describe("getParceirosByFabricoECategoria()", () => {
        it("deve consultar categoria dentro do tenant autenticado", async () => {
            mockPrismaService.parceiro.findMany.mockResolvedValue([mockParceiro]);

            const result = await service.getParceirosByFabricoECategoria(1, "Costura");

            expect(result).toEqual([mockParceiro]);
            expect(prisma.parceiro.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 1, categoria: "Costura" },
            });
        });
    });
});
