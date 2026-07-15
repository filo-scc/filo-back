import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TipoProdutoService } from "./tipo-produto.service";

const { PrismaClientKnownRequestError } = Prisma;

describe("TipoProdutoService", () => {
    let service: TipoProdutoService;
    let prisma: any;

    beforeEach(() => {
        prisma = {
            tipoProduto: {
                create: jest.fn(),
                findMany: jest.fn(),
            },
        };
        service = new TipoProdutoService(prisma);
    });

    it("cria um tipo de produto para o fabrico", async () => {
        const tipo = { id: 1, nome: "camisa", fabrico_id: 10 };
        prisma.tipoProduto.create.mockResolvedValue(tipo);

        await expect(service.create({ nome: "camisa" }, 10)).resolves.toEqual(tipo);
        expect(prisma.tipoProduto.create).toHaveBeenCalledWith({
            data: { nome: "camisa", fabrico_id: 10 },
        });
    });

    it("traduz conflito de nome duplicado", async () => {
        prisma.tipoProduto.create.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.create({ nome: "camisa" }, 10)).rejects.toThrow(
            new ConflictException("Já existe um tipo de produto com esse nome."),
        );
    });

    it("lista os tipos por fabrico em ordem alfabetica", async () => {
        const tipos = [{ id: 1, nome: "camisa", fabrico_id: 10 }];
        prisma.tipoProduto.findMany.mockResolvedValue(tipos);

        await expect(service.findAllByFabrico(10)).resolves.toEqual(tipos);
        expect(prisma.tipoProduto.findMany).toHaveBeenCalledWith({
            where: { fabrico_id: 10 },
            orderBy: { nome: "asc" },
        });
    });
});
