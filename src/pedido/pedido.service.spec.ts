import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";

import { PedidoService } from "./pedido.service";
import { PrismaService } from "../prisma/prisma.service";

describe("PedidoService", () => {
    let service: PedidoService;

    const mockPrismaService = {
        pedido: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },

        cliente: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        },

        fabrico: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PedidoService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<PedidoService>(PedidoService);

        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("create", () => {
        it("deve criar um pedido", async () => {
            const pedido = {
                id: 1,
                finalizado: false,
                fabrico_id: 1,
            };

            mockPrismaService.fabrico.findUnique.mockResolvedValue({
                id: 1,
            });

            mockPrismaService.pedido.create.mockResolvedValue(pedido);

            const result = await service.create(
                {
                    finalizado: false,
                    cor: "#FFFFFF",
                    quantidade: 10,
                    custo_total: 125.5,
                },
                1,
            );

            expect(result).toEqual(pedido);

            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    quantidade: 10,
                    custo_total: 125.5,
                }),
            });
        });
    });

    describe("findAll", () => {
        it("deve retornar todos os pedidos", async () => {
            const pedidos = [
                {
                    id: 1,
                    finalizado: false,
                },
            ];

            mockPrismaService.pedido.findMany.mockResolvedValue(pedidos);

            const result = await service.findAll();

            expect(result).toEqual(pedidos);

            expect(mockPrismaService.pedido.findMany).toHaveBeenCalled();
        });
    });

    describe("findOne", () => {
        it("deve retornar um pedido", async () => {
            const pedido = {
                id: 1,
                finalizado: false,
            };

            mockPrismaService.pedido.findUnique.mockResolvedValue(pedido);

            const result = await service.getById(1);

            expect(result).toEqual(pedido);
        });

        it("deve lançar NotFoundException se pedido não existir", async () => {
            mockPrismaService.pedido.findUnique.mockResolvedValue(null);

            await expect(service.getById(1)).rejects.toThrow(NotFoundException);
        });
    });

    describe("findByCliente", () => {
        it("deve retornar pedidos de um cliente", async () => {
            const pedidos = [
                {
                    id: 1,
                    cliente_id: 7,
                },
            ];

            mockPrismaService.pedido.findMany.mockResolvedValue(pedidos);

            const result = await service.findAllCliente(7);

            expect(result).toEqual(pedidos);

            expect(mockPrismaService.pedido.findMany).toHaveBeenCalledWith({
                where: {
                    cliente_id: 7,
                },
            });
        });
    });

    describe("update", () => {
        it("deve atualizar um pedido", async () => {
            const pedidoAtualizado = {
                id: 1,
                finalizado: true,
            };

            mockPrismaService.pedido.findUnique.mockResolvedValue({
                id: 1,
            });

            mockPrismaService.pedido.update.mockResolvedValue(pedidoAtualizado);

            const result = await service.update(
                1,
                {
                    finalizado: true,
                    custo_total: 140.75,
                },
                1,
            );

            expect(result).toEqual(pedidoAtualizado);

            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    finalizado: true,
                    custo_total: 140.75,
                }),
            });
        });

        it("deve lançar erro se pedido não existir", async () => {
            mockPrismaService.pedido.findUnique.mockResolvedValue(null);

            await expect(
                service.update(
                    1,
                    {
                        finalizado: true,
                    },
                    1,
                ),
            ).rejects.toThrow(NotFoundException);
        });

        it("deve lançar erro se cliente não existir", async () => {
            mockPrismaService.pedido.findUnique.mockResolvedValue({
                id: 1,
            });

            mockPrismaService.cliente.findUnique.mockResolvedValue(null);

            await expect(
                service.update(
                    1,
                    {
                        cliente_id: 99,
                    },
                    1,
                ),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("remove", () => {
        it("deve remover um pedido", async () => {
            const pedido = {
                id: 1,
            };

            mockPrismaService.pedido.findUnique.mockResolvedValue(pedido);

            mockPrismaService.pedido.delete.mockResolvedValue(pedido);

            const result = await service.delete(1);

            expect(result).toEqual("O pedido com o id 1 foi deletado com sucesso");

            expect(mockPrismaService.pedido.delete).toHaveBeenCalledWith({
                where: {
                    id: 1,
                },
            });
        });

        it("deve lançar erro se pedido não existir", async () => {
            mockPrismaService.pedido.findUnique.mockResolvedValue(null);

            await expect(service.delete(1)).rejects.toThrow(NotFoundException);
        });
    });
});
