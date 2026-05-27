import { Test, TestingModule } from "@nestjs/testing";
import { ProdutoAviamentoService } from "./produto-aviamento.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException, ConflictException } from "@nestjs/common";

const mockPrismaService = {
    produto: { findUnique: jest.fn() },
    aviamento: { findUnique: jest.fn() },
    produtoAviamento: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
};

describe("ProdutoAviamentoService", () => {
    let service: ProdutoAviamentoService;
    let prisma: typeof mockPrismaService;

    const mockProdutoAviamento = {
        id: 1,
        produto_id: 1,
        aviamento_id: 2,
        custo: 15.5,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProdutoAviamentoService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<ProdutoAviamentoService>(ProdutoAviamentoService);
        prisma = module.get(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("deve estar definido", () => {
        expect(service).toBeDefined();
    });

    describe("Criando relacionamento produto-aviamento", () => {
        const dto = { produto_id: 1, aviamento_id: 2, custo: 15.5 };

        it("deve criar um relacionamento com sucesso", async () => {
            prisma.produto.findUnique.mockResolvedValue({ id: 1 });
            prisma.aviamento.findUnique.mockResolvedValue({ id: 2 });
            prisma.produtoAviamento.findFirst.mockResolvedValue(null);
            prisma.produtoAviamento.create.mockResolvedValue(mockProdutoAviamento);

            const result = await service.create(dto);

            expect(result).toEqual(mockProdutoAviamento);
            expect(prisma.produtoAviamento.create).toHaveBeenCalledWith({ data: dto });
        });

        it("deve lançar NotFoundException se o produto não existir", async () => {
            prisma.produto.findUnique.mockResolvedValue(null);

            await expect(service.create(dto)).rejects.toThrow(NotFoundException);
            expect(prisma.aviamento.findUnique).not.toHaveBeenCalled();
        });

        it("deve lançar NotFoundException se o aviamento não existir", async () => {
            prisma.produto.findUnique.mockResolvedValue({ id: 1 });
            prisma.aviamento.findUnique.mockResolvedValue(null);

            await expect(service.create(dto)).rejects.toThrow(NotFoundException);
            expect(prisma.produtoAviamento.findFirst).not.toHaveBeenCalled();
        });

        it("deve lançar ConflictException se o vínculo já existir", async () => {
            prisma.produto.findUnique.mockResolvedValue({ id: 1 });
            prisma.aviamento.findUnique.mockResolvedValue({ id: 2 });
            prisma.produtoAviamento.findFirst.mockResolvedValue(mockProdutoAviamento);

            await expect(service.create(dto)).rejects.toThrow(ConflictException);
            expect(prisma.produtoAviamento.create).not.toHaveBeenCalled();
        });
    });

    describe("Retorna todos os relacionamentos", () => {
        it("deve retornar todos os relacionamentos com sucesso", async () => {
            prisma.produtoAviamento.findMany.mockResolvedValue([mockProdutoAviamento]);

            const result = await service.findAll();

            expect(result).toEqual([mockProdutoAviamento]);
            expect(prisma.produtoAviamento.findMany).toHaveBeenCalled();
        });
    });

    describe("Retorna o relacionamento expeifico", () => {
        it("deve retornar o relacionamento do determinado id com sucesso", async () => {
            prisma.produtoAviamento.findUnique.mockResolvedValue(mockProdutoAviamento);

            const result = await service.findOne(1);

            expect(result).toEqual(mockProdutoAviamento);
            expect(prisma.produtoAviamento.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
                include: { produto: true, aviamento: true },
            });
        });

        it("deve lançar NotFoundException se o relacionamento não existir", async () => {
            prisma.produtoAviamento.findUnique.mockResolvedValue(null);

            await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
        });
    });

    describe("Retorna todos os relacionamento do determinado produto", () => {
        it("deve retornar com sucesso todos os relacionamentos do determinado produto", async () => {
            prisma.produto.findUnique.mockResolvedValue({ id: 1 });
            prisma.produtoAviamento.findMany.mockResolvedValue([mockProdutoAviamento]);

            const result = await service.findAllByProduto(1);

            expect(result).toEqual([mockProdutoAviamento]);
            expect(prisma.produtoAviamento.findMany).toHaveBeenCalledWith({
                where: { produto_id: 1 },
                include: { aviamento: true },
            });
        });

        it("deve lançar NotFoundException se o produto não existir", async () => {
            prisma.produto.findUnique.mockResolvedValue(null);

            await expect(service.findAllByProduto(999)).rejects.toThrow(NotFoundException);
            expect(prisma.produtoAviamento.findMany).not.toHaveBeenCalled();
        });
    });

    describe("Retorna todos os relacionamento do determinado aviamento", () => {
        it("deve retornar com sucesso todos os relacionamentos do determinado aviamento", async () => {
            prisma.aviamento.findUnique.mockResolvedValue({ id: 2 });
            prisma.produtoAviamento.findMany.mockResolvedValue([mockProdutoAviamento]);

            const result = await service.findAllByAviamento(2);

            expect(result).toEqual([mockProdutoAviamento]);
            expect(prisma.produtoAviamento.findMany).toHaveBeenCalledWith({
                where: { aviamento_id: 2 },
                include: { produto: true },
            });
        });

        it("deve lançar NotFoundException se o aviamento não existir", async () => {
            prisma.aviamento.findUnique.mockResolvedValue(null);

            await expect(service.findAllByAviamento(999)).rejects.toThrow(NotFoundException);
            expect(prisma.produtoAviamento.findMany).not.toHaveBeenCalled();
        });
    });

    describe("Atualiza o relacionamento produto-aviamento", () => {
        const dto = { custo: 20.0 };

        it("deve atualizar com sucesso", async () => {
            prisma.produtoAviamento.findUnique.mockResolvedValue(mockProdutoAviamento);
            prisma.produtoAviamento.update.mockResolvedValue({ ...mockProdutoAviamento, ...dto });

            const result = await service.update(1, dto);

            expect(result.custo).toEqual(20.0);
            expect(prisma.produtoAviamento.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: dto,
            });
        });

        it("deve lançar NotFoundException se o relacionamento não for encontrado", async () => {
            prisma.produtoAviamento.findUnique.mockResolvedValue(null);

            await expect(service.update(999, dto)).rejects.toThrow(NotFoundException);
            expect(prisma.produtoAviamento.update).not.toHaveBeenCalled();
        });
    });

    describe("Remove o relacionamento entre produto e aviamento", () => {
        it("deve deletar com sucesso", async () => {
            prisma.produtoAviamento.findUnique.mockResolvedValue(mockProdutoAviamento);
            prisma.produtoAviamento.delete.mockResolvedValue(mockProdutoAviamento);

            const result = await service.remove(1);

            expect(result).toEqual(mockProdutoAviamento);
            expect(prisma.produtoAviamento.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it("deve lançar NotFoundException se o relacionamento não for encontrado", async () => {
            prisma.produtoAviamento.findUnique.mockResolvedValue(null);

            await expect(service.remove(999)).rejects.toThrow(NotFoundException);
            expect(prisma.produtoAviamento.delete).not.toHaveBeenCalled();
        });
    });
});
