import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { EtapaService } from "./etapa.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";

const mockPrismaService = {
    etapa: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
    },
    icone: {
        findUnique: jest.fn(),
    },
    produto: {
        findMany: jest.fn(),
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

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrismaService.$transaction.mockImplementation((callback) =>
            callback(mockPrismaService),
        );
        mockPrismaService.produto.findMany.mockResolvedValue([]);
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
            const resultado = await service.create(data, 1);

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
            await expect(service.create({ ...etapaFabrico1, fabrico_id: 2 }, 1)).rejects.toThrow(
                BadRequestException,
            );
            expect(mockPrismaService.etapa.create).not.toHaveBeenCalled();
        });

        it("lança NotFoundException quando o ícone não existe", async () => {
            mockPrismaService.icone.findUnique.mockResolvedValue(null);

            await expect(service.create(etapaFabrico1, 1)).rejects.toThrow(NotFoundException);
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

            await expect(service.create(etapaFabrico1, 1)).rejects.toThrow(ConflictException);
        });
    });

    describe("findAllByFabricoID", () => {
        it("lista somente etapas do fabrico informado em ordem produtiva", async () => {
            mockPrismaService.etapa.findMany.mockResolvedValue([etapaFabrico1]);

            const resultado = await service.findAllByFabricoID(1);

            expect(resultado).toEqual([etapaFabrico1]);
            expect(resultado).not.toContain(etapaFabrico2);
            expect(mockPrismaService.etapa.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 1 },
                orderBy: { ordem: "asc" },
                include: { icone: true, icone_verde: true, icone_cinza: true },
            });
        });
    });

    describe("getById", () => {
        it("busca etapa por id dentro do fabrico autenticado", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(etapaFabrico1);

            await expect(service.getById(1, 1)).resolves.toEqual(etapaFabrico1);
            expect(mockPrismaService.etapa.findFirst).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: 1 },
            });
        });

        it("retorna 404 ao consultar etapa de outro tenant", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(null);

            await expect(service.getById(2, 1)).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.etapa.findFirst).toHaveBeenCalledWith({
                where: { id: 2, fabrico_id: 1 },
            });
        });
    });

    describe("update", () => {
        it("atualiza somente etapa pertencente ao fabrico autenticado", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(etapaFabrico1);
            mockPrismaService.etapa.update.mockResolvedValue({ ...etapaFabrico1, nome: "Corte" });

            const resultado = await service.update(1, { nome: "Corte" }, 1);

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
            await expect(service.update(1, { fabrico_id: 2 }, 1)).rejects.toThrow(
                BadRequestException,
            );
            expect(mockPrismaService.etapa.update).not.toHaveBeenCalled();
        });

        it("retorna 404 ao alterar etapa de outro tenant", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(null);

            await expect(service.update(2, { nome: "Corte" }, 1)).rejects.toThrow(
                NotFoundException,
            );
            expect(mockPrismaService.etapa.update).not.toHaveBeenCalled();
        });
    });

    describe("delete", () => {
        it("exclui somente etapa pertencente ao fabrico autenticado", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(etapaFabrico1);
            mockPrismaService.etapa.delete.mockResolvedValue(etapaFabrico1);

            await expect(service.delete(1, 1)).resolves.toEqual(etapaFabrico1);
            expect(mockPrismaService.etapa.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("retorna 404 ao excluir etapa de outro tenant", async () => {
            mockPrismaService.etapa.findFirst.mockResolvedValue(null);

            await expect(service.delete(2, 1)).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.etapa.delete).not.toHaveBeenCalled();
        });
    });
});
