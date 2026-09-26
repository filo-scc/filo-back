import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { ProdutoAviamentoService } from "./produto-aviamento.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

const { PrismaClientKnownRequestError } = Prisma;

const mockPrismaService = {
    produto: { findFirst: jest.fn() },
    aviamento: { findFirst: jest.fn() },
    produtoAviamento: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    $transaction: jest.fn(),
};

const mockProdutoService = {
    bloquearProdutosParaRecalculo: jest.fn(),
    recalcularCustoTotal: jest.fn(),
};

describe("ProdutoAviamentoService", () => {
    let service: ProdutoAviamentoService;
    let prisma: typeof mockPrismaService;

    const mockUser: AuthenticatedUser = {
        id: 1,
        cargo: "PROPRIETARIO",
        fabrico_id: 10,
    } as AuthenticatedUser;

    const mockUserSemFabrico: AuthenticatedUser = {
        id: 2,
        cargo: "PROPRIETARIO",
    } as AuthenticatedUser;

    const mockProdutoAviamento = {
        id: 1,
        produto_id: 1,
        aviamento_id: 2,
        produto: { id: 1, fabrico_id: 10 },
        aviamento: { id: 2, fabrico_id: 10 },
        custo: 15.5,
        quantidade: 1,
    };

    beforeEach(async () => {
        mockPrismaService.$transaction.mockImplementation((callback) =>
            callback(mockPrismaService),
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProdutoAviamentoService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: ProdutoService, useValue: mockProdutoService },
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

    describe("Validação de usuário", () => {
        it("deve lançar BadRequestException se o usuário não possuir fabrico_id", async () => {
            await expect(service.findAll(mockUserSemFabrico)).rejects.toThrow(
                new BadRequestException("Usuário não possui um fabrico associado"),
            );
        });
    });

    describe("Criando relacionamento produto-aviamento", () => {
        const dto = { produto_id: 1, aviamento_id: 2, custo: 15.5 };

        it("deve criar um relacionamento com sucesso", async () => {
            prisma.produto.findFirst.mockResolvedValue({ id: 1, fabrico_id: 10 });
            prisma.aviamento.findFirst.mockResolvedValue({ id: 2, fabrico_id: 10 });
            prisma.produtoAviamento.findFirst.mockResolvedValue(null);
            prisma.produtoAviamento.create.mockResolvedValue(mockProdutoAviamento);

            const result = await service.create(dto, mockUser);

            expect(result).toEqual(mockProdutoAviamento);
            expect(prisma.produtoAviamento.create).toHaveBeenCalledWith({ data: dto });
            expect(mockProdutoService.recalcularCustoTotal).toHaveBeenCalledWith(
                mockProdutoAviamento.produto_id,
                mockPrismaService,
            );
            expect(
                mockProdutoService.bloquearProdutosParaRecalculo.mock.invocationCallOrder[0],
            ).toBeLessThan(prisma.produtoAviamento.create.mock.invocationCallOrder[0]);
        });

        it("deve lançar BadRequestException se fabrico_id diferente for informado no payload", async () => {
            await expect(service.create({ ...dto, fabrico_id: 99 }, mockUser)).rejects.toThrow(
                new BadRequestException("Não é permitido alterar o fabrico do relacionamento"),
            );
            expect(prisma.produto.findFirst).not.toHaveBeenCalled();
        });

        it("deve lançar NotFoundException se o produto não existir", async () => {
            prisma.produto.findFirst.mockResolvedValue(null);

            await expect(service.create(dto, mockUser)).rejects.toThrow(
                new NotFoundException("Produto não encontrado"),
            );
            expect(prisma.aviamento.findFirst).not.toHaveBeenCalled();
        });

        it("deve lançar NotFoundException se o aviamento não existir", async () => {
            prisma.produto.findFirst.mockResolvedValue({ id: 1, fabrico_id: 10 });
            prisma.aviamento.findFirst.mockResolvedValue(null);

            await expect(service.create(dto, mockUser)).rejects.toThrow(
                new NotFoundException("Aviamento não encontrado"),
            );
            expect(prisma.produtoAviamento.findFirst).not.toHaveBeenCalled();
        });

        it("deve lançar ConflictException se o vínculo já existir", async () => {
            prisma.produto.findFirst.mockResolvedValue({ id: 1, fabrico_id: 10 });
            prisma.aviamento.findFirst.mockResolvedValue({ id: 2, fabrico_id: 10 });
            prisma.produtoAviamento.findFirst.mockResolvedValue(mockProdutoAviamento);

            await expect(service.create(dto, mockUser)).rejects.toThrow(
                new ConflictException("Esse aviamento já está vinculado a este produto"),
            );
            expect(prisma.produtoAviamento.create).not.toHaveBeenCalled();
        });

        it("deve traduzir erro de duplicidade (P2002) para ConflictException", async () => {
            prisma.produto.findFirst.mockResolvedValue({ id: 1, fabrico_id: 10 });
            prisma.aviamento.findFirst.mockResolvedValue({ id: 2, fabrico_id: 10 });
            prisma.produtoAviamento.findFirst.mockResolvedValue(null);
            prisma.produtoAviamento.create.mockRejectedValue(
                new PrismaClientKnownRequestError("duplicado", {
                    code: "P2002",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(service.create(dto, mockUser)).rejects.toThrow(
                new ConflictException("Esse aviamento já está vinculado a este produto"),
            );
        });

        it("deve traduzir erro de chave estrangeira (P2003) para NotFoundException", async () => {
            prisma.produto.findFirst.mockResolvedValue({ id: 1, fabrico_id: 10 });
            prisma.aviamento.findFirst.mockResolvedValue({ id: 2, fabrico_id: 10 });
            prisma.produtoAviamento.findFirst.mockResolvedValue(null);
            prisma.produtoAviamento.create.mockRejectedValue(
                new PrismaClientKnownRequestError("fk inválida", {
                    code: "P2003",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(service.create(dto, mockUser)).rejects.toThrow(
                new NotFoundException("Relacionamento inválido"),
            );
        });
    });

    describe("Retorna todos os relacionamentos", () => {
        it("deve retornar todos os relacionamentos com sucesso", async () => {
            prisma.produtoAviamento.findMany.mockResolvedValue([mockProdutoAviamento]);

            const result = await service.findAll(mockUser);

            expect(result).toEqual([mockProdutoAviamento]);
            expect(prisma.produtoAviamento.findMany).toHaveBeenCalledWith({
                where: {
                    produto: { fabrico_id: 10 },
                    aviamento: { fabrico_id: 10 },
                },
                include: {
                    produto: true,
                    aviamento: true,
                },
            });
        });
    });

    describe("Retorna o relacionamento específico", () => {
        it("deve retornar o relacionamento do determinado id com sucesso", async () => {
            prisma.produtoAviamento.findFirst.mockResolvedValue(mockProdutoAviamento);

            const result = await service.findOne(1, mockUser);

            expect(result).toEqual(mockProdutoAviamento);
            expect(prisma.produtoAviamento.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    produto: { fabrico_id: 10 },
                    aviamento: { fabrico_id: 10 },
                },
                include: { produto: true, aviamento: true },
            });
        });

        it("deve lançar NotFoundException se o relacionamento não existir", async () => {
            prisma.produtoAviamento.findFirst.mockResolvedValue(null);

            await expect(service.findOne(999, mockUser)).rejects.toThrow(
                new NotFoundException(
                    "O relacionamento entre produto e aviamento não foi encontrado",
                ),
            );
        });
    });

    describe("Retorna todos os relacionamentos de um determinado produto", () => {
        it("deve retornar com sucesso todos os relacionamentos do produto", async () => {
            prisma.produto.findFirst.mockResolvedValue({ id: 1, fabrico_id: 10 });
            prisma.produtoAviamento.findMany.mockResolvedValue([mockProdutoAviamento]);

            const result = await service.findAllByProduto(1, mockUser);

            expect(result).toEqual([mockProdutoAviamento]);
            expect(prisma.produtoAviamento.findMany).toHaveBeenCalledWith({
                where: { produto_id: 1, aviamento: { fabrico_id: 10 } },
                include: { aviamento: true },
            });
        });

        it("deve lançar NotFoundException se o produto não existir", async () => {
            prisma.produto.findFirst.mockResolvedValue(null);

            await expect(service.findAllByProduto(999, mockUser)).rejects.toThrow(
                new NotFoundException("Produto não encontrado"),
            );
            expect(prisma.produtoAviamento.findMany).not.toHaveBeenCalled();
        });
    });

    describe("Retorna todos os relacionamentos de um determinado aviamento", () => {
        it("deve retornar com sucesso todos os relacionamentos do aviamento", async () => {
            prisma.aviamento.findFirst.mockResolvedValue({ id: 2, fabrico_id: 10 });
            prisma.produtoAviamento.findMany.mockResolvedValue([mockProdutoAviamento]);

            const result = await service.findAllByAviamento(2, mockUser);

            expect(result).toEqual([mockProdutoAviamento]);
            expect(prisma.produtoAviamento.findMany).toHaveBeenCalledWith({
                where: { aviamento_id: 2, produto: { fabrico_id: 10 } },
                include: { produto: true },
            });
        });

        it("deve lançar NotFoundException se o aviamento não existir", async () => {
            prisma.aviamento.findFirst.mockResolvedValue(null);

            await expect(service.findAllByAviamento(999, mockUser)).rejects.toThrow(
                new NotFoundException("Aviamento não encontrado"),
            );
            expect(prisma.produtoAviamento.findMany).not.toHaveBeenCalled();
        });
    });

    describe("Atualiza o relacionamento produto-aviamento", () => {
        const dto = { custo: 20.0 };

        it("deve atualizar com sucesso", async () => {
            prisma.produtoAviamento.findFirst.mockResolvedValue(mockProdutoAviamento);
            prisma.produtoAviamento.update.mockResolvedValue({ ...mockProdutoAviamento, ...dto });

            const result = await service.update(1, dto, mockUser);

            expect(result.custo).toEqual(20.0);
            expect(prisma.produtoAviamento.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: dto,
            });
            expect(mockProdutoService.recalcularCustoTotal).toHaveBeenCalledWith(
                mockProdutoAviamento.produto_id,
                mockPrismaService,
            );
            expect(
                mockProdutoService.bloquearProdutosParaRecalculo.mock.invocationCallOrder[0],
            ).toBeLessThan(prisma.produtoAviamento.update.mock.invocationCallOrder[0]);
        });

        it("deve lançar BadRequestException se tentar alterar o fabrico_id", async () => {
            await expect(
                service.update(1, { custo: 20.0, fabrico_id: 99 }, mockUser),
            ).rejects.toThrow(
                new BadRequestException("Não é permitido alterar o fabrico do relacionamento"),
            );
            expect(prisma.produtoAviamento.update).not.toHaveBeenCalled();
        });

        it("invalida o custo salvo quando a quantidade muda sem um novo custo", async () => {
            prisma.produtoAviamento.findFirst.mockResolvedValue(mockProdutoAviamento);
            prisma.produtoAviamento.update.mockResolvedValue({
                ...mockProdutoAviamento,
                quantidade: 2,
                custo: null,
            });

            await service.update(1, { quantidade: 2 }, mockUser);

            expect(prisma.produtoAviamento.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { quantidade: 2, custo: null },
            });
        });

        it("preserva um novo custo zero enviado explicitamente com a quantidade", async () => {
            prisma.produtoAviamento.findFirst.mockResolvedValue(mockProdutoAviamento);
            prisma.produtoAviamento.update.mockResolvedValue({
                ...mockProdutoAviamento,
                quantidade: 2,
                custo: 0,
            });

            await service.update(1, { quantidade: 2, custo: 0 }, mockUser);

            expect(prisma.produtoAviamento.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { quantidade: 2, custo: 0 },
            });
        });

        it("deve lançar NotFoundException se o relacionamento não for encontrado", async () => {
            prisma.produtoAviamento.findFirst.mockResolvedValue(null);

            await expect(service.update(999, dto, mockUser)).rejects.toThrow(
                new NotFoundException(
                    "O relacionamento entre produto e aviamento não foi encontrado",
                ),
            );
            expect(prisma.produtoAviamento.update).not.toHaveBeenCalled();
        });

        it("nunca envia produto_id/aviamento_id ao Prisma mesmo se presentes no payload", async () => {
            prisma.produtoAviamento.findFirst.mockResolvedValue(mockProdutoAviamento);
            prisma.produtoAviamento.update.mockResolvedValue(mockProdutoAviamento);

            const payloadMalicioso = {
                quantidade: 5,
                produto_id: 999,
                aviamento_id: 888,
            } as any;

            await service.update(1, payloadMalicioso, mockUser);

            const dadosEnviados = prisma.produtoAviamento.update.mock.calls[0][0].data;
            expect(dadosEnviados).not.toHaveProperty("produto_id");
            expect(dadosEnviados).not.toHaveProperty("aviamento_id");
        });

        it("deve traduzir erro P2002 na atualização para ConflictException", async () => {
            prisma.produtoAviamento.findFirst.mockResolvedValue(mockProdutoAviamento);
            prisma.produtoAviamento.update.mockRejectedValue(
                new PrismaClientKnownRequestError("duplicado", {
                    code: "P2002",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(service.update(1, dto, mockUser)).rejects.toThrow(
                new ConflictException("Esse aviamento já está vinculado a este produto"),
            );
        });

        it("deve traduzir erro P2003 na atualização para NotFoundException", async () => {
            prisma.produtoAviamento.findFirst.mockResolvedValue(mockProdutoAviamento);
            prisma.produtoAviamento.update.mockRejectedValue(
                new PrismaClientKnownRequestError("fk inválida", {
                    code: "P2003",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(service.update(1, dto, mockUser)).rejects.toThrow(
                new NotFoundException("Relacionamento inválido"),
            );
        });
    });

    describe("Remove o relacionamento entre produto e aviamento", () => {
        it("deve deletar com sucesso", async () => {
            prisma.produtoAviamento.findFirst.mockResolvedValue(mockProdutoAviamento);
            prisma.produtoAviamento.delete.mockResolvedValue(mockProdutoAviamento);

            const result = await service.remove(1, mockUser);

            expect(result).toEqual(mockProdutoAviamento);
            expect(prisma.produtoAviamento.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });
            expect(mockProdutoService.recalcularCustoTotal).toHaveBeenCalledWith(
                mockProdutoAviamento.produto_id,
                mockPrismaService,
            );
            expect(
                mockProdutoService.bloquearProdutosParaRecalculo.mock.invocationCallOrder[0],
            ).toBeLessThan(prisma.produtoAviamento.delete.mock.invocationCallOrder[0]);
        });

        it("deve lançar NotFoundException se o relacionamento não for encontrado", async () => {
            prisma.produtoAviamento.findFirst.mockResolvedValue(null);

            await expect(service.remove(999, mockUser)).rejects.toThrow(
                new NotFoundException(
                    "O relacionamento entre produto e aviamento não foi encontrado",
                ),
            );
            expect(prisma.produtoAviamento.delete).not.toHaveBeenCalled();
        });

        it("deve traduzir erro P2003 na remoção para NotFoundException", async () => {
            prisma.produtoAviamento.findFirst.mockResolvedValue(mockProdutoAviamento);
            prisma.produtoAviamento.delete.mockRejectedValue(
                new PrismaClientKnownRequestError("fk inválida", {
                    code: "P2003",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(service.remove(1, mockUser)).rejects.toThrow(
                new NotFoundException("Relacionamento inválido"),
            );
        });
    });
});
