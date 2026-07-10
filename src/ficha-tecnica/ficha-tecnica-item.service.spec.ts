import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { FichaTecnicaItemService } from "./ficha-tecnica-item.service";

const { PrismaClientKnownRequestError, PrismaClientValidationError } = Prisma;

describe("FichaTecnicaItemService", () => {
    let service: FichaTecnicaItemService;
    let prisma: any;

    const ficha = { id: 1, fabrico_id: 10, grade_versao_id: 20 };
    const itemDto = { cor_id: 30, grade_versao_item_id: 40, quantidade: 5 };

    beforeEach(() => {
        prisma = {
            $transaction: jest.fn(async (callback) => callback(prisma)),
            fichaTecnica: { findUnique: jest.fn() },
            fichaTecnicaItem: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                deleteMany: jest.fn(),
                createMany: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            cor: { findMany: jest.fn(), findFirst: jest.fn() },
            gradeVersaoItem: { findMany: jest.fn() },
        };
        service = new FichaTecnicaItemService(prisma);
    });

    it("lista itens por ficha técnica", async () => {
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAllByFichaTecnicaID(1)).resolves.toEqual([{ id: 1 }]);
        expect(prisma.fichaTecnicaItem.findMany).toHaveBeenCalledWith({
            where: { ficha_tecnica_id: 1 },
            include: {
                cor: true,
                grade_versao_item: {
                    include: { tamanho: true, grade_versao: true },
                },
            },
            orderBy: [{ cor_id: "asc" }, { grade_versao_item: { posicao: "asc" } }],
        });
    });

    it("traduz parâmetro inválido ao listar itens", async () => {
        prisma.fichaTecnicaItem.findMany.mockRejectedValue(
            new PrismaClientValidationError("invalid", { clientVersion: "7.0.0" }),
        );

        await expect(service.findAllByFichaTecnicaID(1)).rejects.toThrow(
            new BadRequestException("Parâmetros inválidos"),
        );
    });

    it("busca um item existente", async () => {
        prisma.fichaTecnicaItem.findUnique.mockResolvedValue({ id: 1 });

        await expect(service.findOne(1)).resolves.toEqual({ id: 1 });
    });

    it("rejeita item inexistente", async () => {
        prisma.fichaTecnicaItem.findUnique.mockResolvedValue(null);

        await expect(service.findOne(1)).rejects.toThrow(
            new NotFoundException("Item da ficha técnica não encontrado"),
        );
    });

    it("salva itens da ficha técnica em lote", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ id: 99 }]);

        await expect(service.createManyByFichaTecnicaID(1, [itemDto])).resolves.toEqual({
            message: "Itens da ficha técnica salvos com sucesso",
            data: [{ id: 99 }],
        });

        expect(prisma.fichaTecnicaItem.deleteMany).toHaveBeenCalledWith({
            where: { ficha_tecnica_id: 1 },
        });
        expect(prisma.fichaTecnicaItem.createMany).toHaveBeenCalledWith({
            data: [
                {
                    ficha_tecnica_id: 1,
                    cor_id: 30,
                    grade_versao_item_id: 40,
                    quantidade: 5,
                },
            ],
        });
    });

    it("rejeita lote para ficha inexistente", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(null);

        await expect(service.createManyByFichaTecnicaID(1, [itemDto])).rejects.toThrow(
            new NotFoundException("Ficha técnica não encontrada"),
        );
    });

    it("rejeita lote vazio", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);

        await expect(service.createManyByFichaTecnicaID(1, [])).rejects.toThrow(
            new BadRequestException("Informe ao menos um item para a ficha técnica"),
        );
    });

    it("rejeita itens duplicados no lote", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);

        await expect(
            service.createManyByFichaTecnicaID(1, [itemDto, itemDto]),
        ).rejects.toThrow(
            new BadRequestException("Existem itens duplicados na mesma ficha técnica"),
        );
    });

    it("rejeita cores fora do fabrico da ficha", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([]);

        await expect(service.createManyByFichaTecnicaID(1, [itemDto])).rejects.toThrow(
            new BadRequestException("Uma ou mais cores não pertencem ao fabrico da ficha técnica"),
        );
    });

    it("rejeita itens de grade fora da versão da ficha", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([]);

        await expect(service.createManyByFichaTecnicaID(1, [itemDto])).rejects.toThrow(
            new BadRequestException(
                "Um ou mais itens de grade não pertencem à versão da ficha técnica",
            ),
        );
    });

    it("traduz conflito Prisma ao salvar lote", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }]);
        prisma.$transaction.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.createManyByFichaTecnicaID(1, [itemDto])).rejects.toThrow(
            new ConflictException("Já existe um item com essa combinação na ficha técnica"),
        );
    });

    it("atualiza um item preservando valores não enviados", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({
            id: 1,
            cor_id: 30,
            grade_versao_item_id: 40,
            quantidade: 5,
        } as any);
        prisma.fichaTecnicaItem.update.mockResolvedValue({ id: 1, quantidade: 8 });

        await expect(service.update(1, { quantidade: 8 })).resolves.toEqual({
            message: "Item da ficha técnica atualizado com sucesso",
            data: { id: 1, quantidade: 8 },
        });
        expect(prisma.fichaTecnicaItem.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { cor_id: 30, grade_versao_item_id: 40, quantidade: 8 },
            include: {
                cor: true,
                grade_versao_item: { include: { tamanho: true, grade_versao: true } },
            },
        });
    });

    it("traduz conflito Prisma ao atualizar item", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({
            id: 1,
            cor_id: 30,
            grade_versao_item_id: 40,
            quantidade: 5,
        } as any);
        prisma.fichaTecnicaItem.update.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.update(1, {})).rejects.toThrow(
            new ConflictException("Já existe um item com essa combinação na ficha técnica"),
        );
    });

    it("remove um item", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1 } as any);
        prisma.fichaTecnicaItem.delete.mockResolvedValue({ id: 1 });

        await expect(service.remove(1)).resolves.toEqual({
            message: "Item da ficha técnica removido com sucesso",
            data: { id: 1 },
        });
    });

    it("limpa itens por ficha técnica", async () => {
        await expect(service.clearByFichaTecnicaID(1)).resolves.toEqual({
            message: "Itens da ficha técnica removidos com sucesso",
        });
        expect(prisma.fichaTecnicaItem.deleteMany).toHaveBeenCalledWith({
            where: { ficha_tecnica_id: 1 },
        });
    });

    it("gera itens para uma cor", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findFirst.mockResolvedValue({ id: 30 });
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }, { id: 41 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ grade_versao_item_id: 40 }]);

        await expect(service.gerarItensPorCor(1, 30)).resolves.toEqual({
            message: "Itens da cor gerados com sucesso",
        });
        expect(prisma.fichaTecnicaItem.createMany).toHaveBeenCalledWith({
            data: [{ ficha_tecnica_id: 1, cor_id: 30, grade_versao_item_id: 41, quantidade: 0 }],
        });
    });

    it("não duplica itens já existentes para uma cor", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findFirst.mockResolvedValue({ id: 30 });
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ grade_versao_item_id: 40 }]);

        await expect(service.gerarItensPorCor(1, 30)).resolves.toEqual({
            message: "Essa cor já possui todos os itens da grade nessa ficha técnica",
        });
    });

    it("rejeita geração por cor fora do fabrico", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findFirst.mockResolvedValue(null);

        await expect(service.gerarItensPorCor(1, 30)).rejects.toThrow(
            new BadRequestException("A cor não pertence ao fabrico da ficha técnica"),
        );
    });

    it("gera itens para múltiplas cores", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }, { id: 31 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }, { id: 41 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([
            { cor_id: 30, grade_versao_item_id: 40 },
        ]);

        await expect(service.gerarItensPorCoresBatch(1, [30, 31])).resolves.toEqual({
            message: "Matriz de cores x tamanhos criada com sucesso",
            itens_criados: 3,
        });
    });

    it("retorna mensagem idempotente no batch quando todas combinações existem", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([
            { cor_id: 30, grade_versao_item_id: 40 },
        ]);

        await expect(service.gerarItensPorCoresBatch(1, [30])).resolves.toEqual({
            message: "Todas as combinações já existem",
        });
    });

    it("remove itens de cores em batch", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        prisma.fichaTecnicaItem.deleteMany.mockResolvedValue({ count: 2 });

        await expect(service.removerCoresBatch(1, [30])).resolves.toEqual({
            message: "Itens das cores removidos com sucesso",
            itens_removidos: 2,
        });
    });

    it("informa quando não há itens para remover em batch", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([]);

        await expect(service.removerCoresBatch(1, [30])).resolves.toEqual({
            message: "Nenhum item encontrado para as cores informadas",
            itens_removidos: 0,
        });
    });

    it("sincroniza cores adicionando e removendo combinações", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 31 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }, { id: 41 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([
            { cor_id: 30, grade_versao_item_id: 40 },
            { cor_id: 30, grade_versao_item_id: 41 },
        ]);

        await expect(service.syncCoresBatch(1, [31, 31])).resolves.toEqual({
            message: "Cores da ficha técnica sincronizadas com sucesso",
            cores_adicionadas: 1,
            cores_removidas: 1,
        });
        expect(prisma.fichaTecnicaItem.deleteMany).toHaveBeenCalledWith({
            where: { ficha_tecnica_id: 1, cor_id: { in: [30] } },
        });
        expect(prisma.fichaTecnicaItem.createMany).toHaveBeenCalledWith({
            data: [
                { ficha_tecnica_id: 1, cor_id: 31, grade_versao_item_id: 40, quantidade: 0 },
                { ficha_tecnica_id: 1, cor_id: 31, grade_versao_item_id: 41, quantidade: 0 },
            ],
        });
    });

    it("rejeita sync quando a grade não possui tamanhos", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([]);

        await expect(service.syncCoresBatch(1, [30])).rejects.toThrow(
            new BadRequestException("A grade da ficha técnica não possui tamanhos configurados"),
        );
    });
});
