import { Test, TestingModule } from "@nestjs/testing";
import { ParceiroService } from "./parceiro.service";
import { PrismaService } from "../prisma/prisma.service";
import { EnderecoService } from "../endereco/endereco.service";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

describe("ParceiroService", () => {
    let service: ParceiroService;
    let prisma: PrismaService;
    let enderecoService: EnderecoService;

    const mockPrismaService = {
        parceiro: {
            findMany: jest.fn<any>(),
            findUnique: jest.fn<any>(),
            findFirst: jest.fn<any>(),
            create: jest.fn<any>(),
            update: jest.fn<any>(),
            delete: jest.fn<any>(),
        },
    };

    const mockEnderecoService = {
        create: jest.fn<any>(),
        update: jest.fn<any>(),
    };

    const mockparceiro = {
        id: 1,
        nome: "Facção Teste",
        fabrico_id: 1,
        responsavel: "Thiago",
        telefone: "11999999999",
        endereco: { id: 10, rua: "Rua T" },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ParceiroService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: EnderecoService, useValue: mockEnderecoService },
            ],
        }).compile();

        service = module.get<ParceiroService>(ParceiroService);
        prisma = module.get<PrismaService>(PrismaService);
        enderecoService = module.get<EnderecoService>(EnderecoService);

        jest.clearAllMocks();
    });

    it("deve estar definido", () => {
        expect(service).toBeDefined();
    });

    describe("getAll()", () => {
        it("deve retornar todos as facções incluindo os seus respectivos endereços", async () => {
            mockPrismaService.parceiro.findMany.mockResolvedValue([mockparceiro]);

            const result = await service.getAll();
            expect(result).toEqual([mockparceiro]);
            expect(prisma.parceiro.findMany).toHaveBeenCalledTimes(1);
        });

        it("deve lançar NotFoundException caso tenha uma falha na requisição com o banco", async () => {
            mockPrismaService.parceiro.findMany.mockRejectedValue(
                new Error("Nenhuma parceiro encontrada"),
            );

            await expect(service.getAll()).rejects.toThrow(NotFoundException);
        });
    });

    describe("getAllparceiroByFabrico()", () => {
        it("deve retornar todas as facções de um determinado fabrico", async () => {
            mockPrismaService.parceiro.findMany.mockResolvedValue([mockparceiro]);

            const result = await service.getAllparceiroByFabrico(1);
            expect(result).toEqual([mockparceiro]);
            expect(prisma.parceiro.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { fabrico_id: 1 } }),
            );
        });
    });

    describe("getById()", () => {
        it("deve retornar os dados de uma parceiro caso ela exista", async () => {
            mockPrismaService.parceiro.findUnique.mockResolvedValue(mockparceiro);

            const result = await service.getById(1);
            expect(result).toEqual(mockparceiro);
            expect(prisma.parceiro.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 1 } }),
            );
        });

        it("deve lançar NotFoundException caso a parceiro não exista", async () => {
            mockPrismaService.parceiro.findUnique.mockResolvedValue(null);

            await expect(service.getById(99)).rejects.toThrow(NotFoundException);
        });
    });

    describe("create()", () => {
        const createDto: any = {
            nome: "Novo parceiro",
            fabrico_id: 1,
            telefone: "81900000000",
            endereco: { rua: "Rua H", cep: "50000000" },
        };

        it("deve criar um parceiro com seu respetivo endereço com sucesso", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);
            mockEnderecoService.create.mockResolvedValue({ id: 20 });
            mockPrismaService.parceiro.create.mockResolvedValue({ id: 2, ...createDto });

            const result = await service.create(createDto);

            expect(result).toEqual({ message: "Parceiro criado com sucesso" });
            expect(enderecoService.create).toHaveBeenCalledWith(createDto.endereco);
            expect(prisma.parceiro.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    nome: "Novo parceiro",
                    endereco: { connect: { id: 20 } },
                }),
                include: { endereco: true },
            });
        });

        it("deve impedir e lançar ConflictException caso tente cadastrar um nome de uma parceiro existente no mesmo fabrico", async () => {
            mockPrismaService.parceiro.findFirst.mockResolvedValue(mockparceiro);

            await expect(service.create(createDto)).rejects.toThrow(ConflictException);
            expect(enderecoService.create).not.toHaveBeenCalled();
            expect(prisma.parceiro.create).not.toHaveBeenCalled();
        });
    });

    describe("update()", () => {
        const updateDto: any = {
            nome: "Parceiro Atualizado",
            endereco: { rua: "I" },
        };

        it("deve atualizar os dados de uma parceiro e seu endereço com sucesso", async () => {
            mockPrismaService.parceiro.findUnique.mockResolvedValue(mockparceiro);
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);

            mockEnderecoService.update.mockResolvedValue({});
            mockPrismaService.parceiro.update.mockResolvedValue({
                ...mockparceiro,
                nome: "Parceiro Atualizado",
            });

            const result = await service.update(1, updateDto);

            expect(result).toEqual({ message: "Parceiro atualizado com sucesso" });
            expect(enderecoService.update).toHaveBeenCalledWith(10, updateDto.endereco);
            expect(prisma.parceiro.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({ nome: "Parceiro Atualizado" }),
            });
        });

        it("deve lançar ConflictException ao tentar atualizar um parceiro para um nome que já existente", async () => {
            mockPrismaService.parceiro.findUnique.mockResolvedValue(mockparceiro);
            mockPrismaService.parceiro.findFirst.mockResolvedValue({
                id: 2,
                nome: "Parceiro Atualizado",
            });

            await expect(service.update(1, updateDto)).rejects.toThrow(ConflictException);
            expect(prisma.parceiro.update).not.toHaveBeenCalled();
        });

        it("deve lançar NotFoundException ao tentar atualizar o endereço de uma parceiro que não possui um endereço prévio cadastrado", async () => {
            mockPrismaService.parceiro.findUnique.mockResolvedValue({
                ...mockparceiro,
                endereco: null,
            });
            mockPrismaService.parceiro.findFirst.mockResolvedValue(null);

            await expect(service.update(1, updateDto)).rejects.toThrow(NotFoundException);
        });

        it("deve atualizar apenas o telefone da parceiro poupando a validação de duplicidade e de endereço", async () => {
            const dtoApenasTelefone = {
                telefone: "11111111111",
            };
            mockPrismaService.parceiro.findUnique.mockResolvedValue(mockparceiro);

            mockPrismaService.parceiro.update.mockResolvedValue({
                ...mockparceiro,
                telefone: "11111111111",
            });

            const result = await service.update(1, dtoApenasTelefone);

            expect(result).toEqual({ message: "Parceiro atualizado com sucesso" });
            expect(prisma.parceiro.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({ telefone: "11111111111" }),
            });

            expect(prisma.parceiro.findFirst).not.toHaveBeenCalled();
            expect(enderecoService.update).not.toHaveBeenCalled();
        });
    });

    describe("delete", () => {
        it("deve excluir a parceiro com sucesso quandoo o ID for válido", async () => {
            mockPrismaService.parceiro.findUnique.mockResolvedValue(mockparceiro);
            mockPrismaService.parceiro.delete.mockResolvedValue(mockparceiro);

            const result = await service.delete(1);

            expect(result).toEqual({ message: "Parceiro foi removido com sucesso" });
            expect(prisma.parceiro.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("deve lançar NotFoundException se tentar excluir parceiro inexistente", async () => {
            mockPrismaService.parceiro.findUnique.mockResolvedValue(null);

            await expect(service.delete(99)).rejects.toThrow(NotFoundException);
            expect(prisma.parceiro.delete).not.toHaveBeenCalled();
        });
    });
});
