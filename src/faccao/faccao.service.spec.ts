import { Test, TestingModule } from "@nestjs/testing";
import { FaccaoService } from "./faccao.service";
import { PrismaService } from "../prisma/prisma.service";
import { EnderecoService } from "../endereco/endereco.service";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

describe("FaccaoService", () => {
    let service: FaccaoService;
    let prisma: PrismaService;
    let enderecoService: EnderecoService;

    const mockPrismaService = {
        faccao: {
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

    const mockFaccao = {
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
                FaccaoService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: EnderecoService, useValue: mockEnderecoService },
            ],
        }).compile();

        service = module.get<FaccaoService>(FaccaoService);
        prisma = module.get<PrismaService>(PrismaService);
        enderecoService = module.get<EnderecoService>(EnderecoService);

        jest.clearAllMocks();
    });

    it("deve estar definido", () => {
        expect(service).toBeDefined();
    });

    describe("getAll()", () => {
        it("deve retornar todos as facções incluindo os seus respectivos endereços", async () => {
            mockPrismaService.faccao.findMany.mockResolvedValue([mockFaccao]);

            const result = await service.getAll();
            expect(result).toEqual([mockFaccao]);
            expect(prisma.faccao.findMany).toHaveBeenCalledTimes(1);
        });

        it("deve lançar NotFoundException caso tenha uma falha na requisição com o banco", async () => {
            mockPrismaService.faccao.findMany.mockRejectedValue(
                new Error("Nenhuma facção encontrada"),
            );

            await expect(service.getAll()).rejects.toThrow(NotFoundException);
        });
    });

    describe("getAllFaccaoByFabrico()", () => {
        it("deve retornar todas as facções de um determinado fabrico", async () => {
            mockPrismaService.faccao.findMany.mockResolvedValue([mockFaccao]);

            const result = await service.getAllFaccaoByFabrico(1);
            expect(result).toEqual([mockFaccao]);
            expect(prisma.faccao.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { fabrico_id: 1 } }),
            );
        });
    });

    describe("getById()", () => {
        it("deve retornar os dados de uma facção caso ela exista", async () => {
            mockPrismaService.faccao.findUnique.mockResolvedValue(mockFaccao);

            const result = await service.getById(1);
            expect(result).toEqual(mockFaccao);
            expect(prisma.faccao.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 1 } }),
            );
        });

        it("deve lançar NotFoundException caso a facção não exista", async () => {
            mockPrismaService.faccao.findUnique.mockResolvedValue(null);

            await expect(service.getById(99)).rejects.toThrow(NotFoundException);
        });
    });

    describe("create()", () => {
        const createDto: any = {
            nome: "Nova Facção",
            fabrico_id: 1,
            telefone: "81900000000",
            endereco: { rua: "Rua H", cep: "50000000" },
        };

        it("deve criar um facção com seu respetivo endereço com sucesso", async () => {
            mockPrismaService.faccao.findFirst.mockResolvedValue(null);
            mockEnderecoService.create.mockResolvedValue({ id: 20 });
            mockPrismaService.faccao.create.mockResolvedValue({ id: 2, ...createDto });

            const result = await service.create(createDto);

            expect(result).toEqual({ message: "Facção criada com sucesso" });
            expect(enderecoService.create).toHaveBeenCalledWith(createDto.endereco);
            expect(prisma.faccao.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    nome: "Nova Facção",
                    endereco: { connect: { id: 20 } },
                }),
                include: { endereco: true },
            });
        });

        it("deve impedir e lançar ConflictException caso tente cadastrar um nome de uma facção existente no mesmo fabrico", async () => {
            mockPrismaService.faccao.findFirst.mockResolvedValue(mockFaccao);

            await expect(service.create(createDto)).rejects.toThrow(ConflictException);
            expect(enderecoService.create).not.toHaveBeenCalled();
            expect(prisma.faccao.create).not.toHaveBeenCalled();
        });
    });

    describe("update()", () => {
        const updateDto: any = {
            nome: "Facção Atualizada",
            endereco: { rua: "I" },
        };

        it("deve atualizar os dados de uma facção e seu endereço com sucesso", async () => {
            mockPrismaService.faccao.findUnique.mockResolvedValue(mockFaccao);
            mockPrismaService.faccao.findFirst.mockResolvedValue(null);

            mockEnderecoService.update.mockResolvedValue({});
            mockPrismaService.faccao.update.mockResolvedValue({
                ...mockFaccao,
                nome: "Facção Atualizada",
            });

            const result = await service.update(1, updateDto);

            expect(result).toEqual({ message: "Facção atualizada com sucesso" });
            expect(enderecoService.update).toHaveBeenCalledWith(10, updateDto.endereco);
            expect(prisma.faccao.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({ nome: "Facção Atualizada" }),
            });
        });

        it("deve lançar ConflictException ao tentar atualizar um facção para um nome que já existente", async () => {
            mockPrismaService.faccao.findUnique.mockResolvedValue(mockFaccao);
            mockPrismaService.faccao.findFirst.mockResolvedValue({
                id: 2,
                nome: "Facção Atualizada",
            });

            await expect(service.update(1, updateDto)).rejects.toThrow(ConflictException);
            expect(prisma.faccao.update).not.toHaveBeenCalled();
        });

        it("deve lançar NotFoundException ao tentar atualizar o endereço de uma facção que não possui um endereço prévio cadastrado", async () => {
            mockPrismaService.faccao.findUnique.mockResolvedValue({
                ...mockFaccao,
                endereco: null,
            });
            mockPrismaService.faccao.findFirst.mockResolvedValue(null);

            await expect(service.update(1, updateDto)).rejects.toThrow(NotFoundException);
        });

        it("deve atualizar apenas o telefone da facção poupando a validação de duplicidade e de endereço", async () => {
            const dtoApenasTelefone = {
                telefone: "11111111111",
            };
            mockPrismaService.faccao.findUnique.mockResolvedValue(mockFaccao);

            mockPrismaService.faccao.update.mockResolvedValue({
                ...mockFaccao,
                telefone: "11111111111",
            });

            const result = await service.update(1, dtoApenasTelefone);

            expect(result).toEqual({ message: "Facção atualizada com sucesso" });
            expect(prisma.faccao.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({ telefone: "11111111111" }),
            });

            expect(prisma.faccao.findFirst).not.toHaveBeenCalled();
            expect(enderecoService.update).not.toHaveBeenCalled();
        });
    });

    describe("delete", () => {
        it("deve excluir a facção com sucesso quandoo o ID for válido", async () => {
            mockPrismaService.faccao.findUnique.mockResolvedValue(mockFaccao);
            mockPrismaService.faccao.delete.mockResolvedValue(mockFaccao);

            const result = await service.delete(1);

            expect(result).toEqual({ message: "Facção foi removida com sucesso" });
            expect(prisma.faccao.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("deve lançar NotFoundException se tentar excluir facção inexistente", async () => {
            mockPrismaService.faccao.findUnique.mockResolvedValue(null);

            await expect(service.delete(99)).rejects.toThrow(NotFoundException);
            expect(prisma.faccao.delete).not.toHaveBeenCalled();
        });
    });
});
