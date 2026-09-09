import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TipoProdutoService } from "./tipo-produto.service";

const { PrismaClientKnownRequestError } = Prisma;

describe("TipoProdutoService", () => {
    let service: TipoProdutoService;
    let prisma: any;
    const fabricoId = 10;

    beforeEach(() => {
        prisma = {
            tipoProduto: {
                create: jest.fn(),
                findMany: jest.fn(),
            },
        };
        service = new TipoProdutoService(prisma);
    });

    describe("create", () => {
        it("cria um tipo de produto para o fabrico do usuário autenticado", async () => {
            const tipo = { id: 1, nome: "camisa", fabrico_id: fabricoId };
            prisma.tipoProduto.create.mockResolvedValue(tipo);

            await expect(service.create({ nome: "camisa" }, fabricoId)).resolves.toEqual(tipo);
            expect(prisma.tipoProduto.create).toHaveBeenCalledWith({
                data: { nome: "camisa", fabrico_id: fabricoId },
            });
        });

        it("bloqueia se for enviado um fabrico_id diferente no payload", async () => {
            await expect(
                service.create({ nome: "camisa", fabrico_id: 99 }, fabricoId),
            ).rejects.toThrow(
                new BadRequestException("Não é permitido alterar o fabrico do tipo de produto"),
            );
        });

        it("traduz conflito de nome duplicado (P2002)", async () => {
            prisma.tipoProduto.create.mockRejectedValue(
                new PrismaClientKnownRequestError("duplicado", {
                    code: "P2002",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(service.create({ nome: "camisa" }, fabricoId)).rejects.toThrow(
                new ConflictException(
                    "Já existe um tipo de produto com este nome para este fabrico",
                ),
            );
        });

        it("traduz erro de relacionamento inválido (P2003)", async () => {
            prisma.tipoProduto.create.mockRejectedValue(
                new PrismaClientKnownRequestError("fk inválida", {
                    code: "P2003",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(service.create({ nome: "camisa" }, fabricoId)).rejects.toThrow(
                new NotFoundException("Relacionamento inválido"),
            );
        });
    });

    describe("findAllByFabrico", () => {
        it("lista os tipos de produto ordenados por nome para o fabrico especificado", async () => {
            const tipos = [{ id: 1, nome: "camisa", fabrico_id: fabricoId }];
            prisma.tipoProduto.findMany.mockResolvedValue(tipos);

            await expect(service.findAllByFabrico(fabricoId)).resolves.toEqual(tipos);
            expect(prisma.tipoProduto.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: fabricoId },
                orderBy: { nome: "asc" },
            });
        });
    });
});
