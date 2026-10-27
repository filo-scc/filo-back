import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { FichaTecnicaItemService } from "./ficha-tecnica-item.service";
import { FichaTecnicaService } from "./ficha-tecnica.service";

const { PrismaClientKnownRequestError, PrismaClientValidationError } = Prisma;

describe("FichaTecnicaItemService", () => {
    let service: FichaTecnicaItemService;
    let prisma: any;
    const fichaTecnicaService = {
        sincronizarPedido: jest.fn(),
        sincronizarFichaParceiros: jest.fn(),
    } as unknown as FichaTecnicaService;

    const ficha = { id: 1, fabrico_id: 10, grade_versao_id: 20 };
    const itemDto = { cor_id: 30, grade_versao_item_id: 40, quantidade: 5 };

    beforeEach(() => {
        prisma = {
            $transaction: jest.fn(async (callback) => callback(prisma)),
            fichaTecnica: { findFirst: jest.fn() },
            fichaTecnicaItem: {
                findMany: jest.fn(),
                findFirst: jest.fn(),
                deleteMany: jest.fn(),
                createMany: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                create: jest.fn(),
            },
            cor: { findMany: jest.fn(), findFirst: jest.fn() },
            gradeVersaoItem: { findMany: jest.fn(), findFirst: jest.fn() },
        };
        service = new FichaTecnicaItemService(prisma as any, fichaTecnicaService);
    });

    it("lista itens por ficha técnica", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAllByFichaTecnicaID(1, 10)).resolves.toEqual([{ id: 1 }]);
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
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.fichaTecnicaItem.findMany.mockRejectedValue(
            new PrismaClientValidationError("invalid", { clientVersion: "7.0.0" }),
        );

        await expect(service.findAllByFichaTecnicaID(1, 10)).rejects.toThrow(
            new BadRequestException("Parâmetros inválidos"),
        );
    });

    it("busca um item existente", async () => {
        prisma.fichaTecnicaItem.findFirst.mockResolvedValue({ id: 1 });

        await expect(service.findOne(1, 10)).resolves.toEqual({ id: 1 });
    });

    it("rejeita item inexistente", async () => {
        prisma.fichaTecnicaItem.findFirst.mockResolvedValue(null);

        await expect(service.findOne(1, 10)).rejects.toThrow(
            new NotFoundException("Item da ficha técnica não encontrado"),
        );
    });

    it("salva itens da ficha técnica em lote", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ id: 99 }]);

        await expect(service.createManyByFichaTecnicaID(1, [itemDto] as any, 10)).resolves.toEqual({
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
        prisma.fichaTecnica.findFirst.mockResolvedValue(null);

        await expect(service.createManyByFichaTecnicaID(1, [itemDto] as any, 10)).rejects.toThrow(
            new NotFoundException("Ficha técnica não encontrada"),
        );
    });

    it("rejeita lote vazio", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);

        await expect(service.createManyByFichaTecnicaID(1, [], 10)).rejects.toThrow(
            new BadRequestException("Informe ao menos um item para a ficha técnica"),
        );
    });

    it("rejeita itens duplicados no lote", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);

        await expect(
            service.createManyByFichaTecnicaID(1, [itemDto, itemDto] as any, 10),
        ).rejects.toThrow(
            new BadRequestException("Existem itens duplicados na mesma ficha técnica"),
        );
    });

    it("rejeita cores fora do fabrico da ficha", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([]);

        await expect(service.createManyByFichaTecnicaID(1, [itemDto] as any, 10)).rejects.toThrow(
            new BadRequestException("Uma ou mais cores não pertencem ao fabrico da ficha técnica"),
        );
    });

    it("rejeita itens de grade fora da versão da ficha", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([]);

        await expect(service.createManyByFichaTecnicaID(1, [itemDto] as any, 10)).rejects.toThrow(
            new BadRequestException(
                "Um ou mais itens de grade não pertencem à versão da ficha técnica",
            ),
        );
    });

    it("traduz conflito Prisma ao salvar lote", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }]);
        prisma.$transaction.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.createManyByFichaTecnicaID(1, [itemDto] as any, 10)).rejects.toThrow(
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

        await expect(service.update(1, { quantidade: 8 } as any, 10)).resolves.toEqual({
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

    it("rejeita update com cor que não pertence ao fabrico da ficha", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({
            id: 1,
            cor_id: 30,
            grade_versao_item_id: 40,
            quantidade: 5,
            ficha_tecnica: { fabrico_id: 10, grade_versao_id: 20 },
        } as any);
        prisma.cor.findFirst.mockResolvedValue(null);

        await expect(service.update(1, { cor_id: 31 } as any, 10)).rejects.toThrow(
            new BadRequestException("A cor não pertence ao fabrico da ficha técnica"),
        );
        expect(prisma.fichaTecnicaItem.update).not.toHaveBeenCalled();
    });

    it("rejeita update com item de grade que não pertence à versão da ficha", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({
            id: 1,
            cor_id: 30,
            grade_versao_item_id: 40,
            quantidade: 5,
            ficha_tecnica: { fabrico_id: 10, grade_versao_id: 20 },
        } as any);
        prisma.gradeVersaoItem.findFirst.mockResolvedValue(null);

        await expect(service.update(1, { grade_versao_item_id: 41 } as any, 10)).rejects.toThrow(
            new BadRequestException("O item de grade não pertence à versão da ficha técnica"),
        );
        expect(prisma.fichaTecnicaItem.update).not.toHaveBeenCalled();
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

        await expect(service.update(1, {} as any, 10)).rejects.toThrow(
            new ConflictException("Já existe um item com essa combinação na ficha técnica"),
        );
    });

    it("remove um item", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1 } as any);
        prisma.fichaTecnicaItem.delete.mockResolvedValue({ id: 1 });

        await expect(service.remove(1, 10)).resolves.toEqual({
            message: "Item da ficha técnica removido com sucesso",
            data: { id: 1 },
        });
    });

    it("limpa itens por ficha técnica", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        await expect(service.clearByFichaTecnicaID(1, 10)).resolves.toEqual({
            message: "Itens da ficha técnica removidos com sucesso",
        });
        expect(prisma.fichaTecnicaItem.deleteMany).toHaveBeenCalledWith({
            where: { ficha_tecnica_id: 1 },
        });
    });

    it("gera itens para uma cor", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findFirst.mockResolvedValue({ id: 30 });
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }, { id: 41 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ grade_versao_item_id: 40 }]);

        await expect(service.gerarItensPorCor(1, 30, 10)).resolves.toEqual({
            message: "Itens da cor gerados com sucesso",
        });
        expect(prisma.fichaTecnicaItem.createMany).toHaveBeenCalledWith({
            data: [{ ficha_tecnica_id: 1, cor_id: 30, grade_versao_item_id: 41, quantidade: 0 }],
        });
    });

    it("não duplica itens já existentes para uma cor", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findFirst.mockResolvedValue({ id: 30 });
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ grade_versao_item_id: 40 }]);

        await expect(service.gerarItensPorCor(1, 30, 10)).resolves.toEqual({
            message: "Essa cor já possui todos os itens da grade nessa ficha técnica",
        });
    });

    it("rejeita geração por cor fora do fabrico", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findFirst.mockResolvedValue(null);

        await expect(service.gerarItensPorCor(1, 30, 10)).rejects.toThrow(
            new BadRequestException("A cor não pertence ao fabrico da ficha técnica"),
        );
    });

    it("rejeita batch com cores fora do fabrico", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]); // só uma das duas veio

        await expect(service.gerarItensPorCoresBatch(1, [30, 31], 10)).rejects.toThrow(
            new BadRequestException("Uma ou mais cores não pertencem ao fabrico da ficha técnica"),
        );
        expect(prisma.fichaTecnicaItem.createMany).not.toHaveBeenCalled();
    });

    it("rejeita batch quando a grade não possui tamanhos", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([]);

        await expect(service.gerarItensPorCoresBatch(1, [30], 10)).rejects.toThrow(
            new BadRequestException("A grade da ficha técnica não possui tamanhos configurados"),
        );
    });

    it("gera itens para múltiplas cores", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }, { id: 31 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }, { id: 41 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([
            { cor_id: 30, grade_versao_item_id: 40 },
        ]);

        await expect(service.gerarItensPorCoresBatch(1, [30, 31], 10)).resolves.toEqual({
            message: "Matriz de cores x tamanhos criada com sucesso",
            itens_criados: 3,
        });
    });

    it("retorna mensagem idempotente no batch quando todas combinações existem", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([
            { cor_id: 30, grade_versao_item_id: 40 },
        ]);

        await expect(service.gerarItensPorCoresBatch(1, [30], 10)).resolves.toEqual({
            message: "Todas as combinações já existem",
        });
    });

    it("remove itens de cores em batch", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        prisma.fichaTecnicaItem.deleteMany.mockResolvedValue({ count: 2 });

        await expect(service.removerCoresBatch(1, [30], 10)).resolves.toEqual({
            message: "Itens das cores removidos com sucesso",
            itens_removidos: 2,
        });
    });

    it("rejeita remoção em batch com cores fora do fabrico", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([]);

        await expect(service.removerCoresBatch(1, [30], 10)).rejects.toThrow(
            new BadRequestException("Uma ou mais cores não pertencem ao fabrico da ficha técnica"),
        );
        expect(prisma.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
    });

    it("informa quando não há itens para remover em batch", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([]);

        await expect(service.removerCoresBatch(1, [30], 10)).resolves.toEqual({
            message: "Nenhum item encontrado para as cores informadas",
            itens_removidos: 0,
        });
    });

    it("sincroniza cores adicionando e removendo combinações", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findMany.mockResolvedValue([{ id: 31 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }, { id: 41 }]);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([
            { cor_id: 30, grade_versao_item_id: 40 },
            { cor_id: 30, grade_versao_item_id: 41 },
        ]);

        await expect(service.syncCoresBatch(1, [31, 31], 10)).resolves.toEqual({
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

    it("rejeita sync com cores fora do fabrico", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([]);
        prisma.cor.findMany.mockResolvedValue([]);

        await expect(service.syncCoresBatch(1, [30], 10)).rejects.toThrow(
            new BadRequestException("Uma ou mais cores não pertencem ao fabrico da ficha técnica"),
        );
    });

    it("rejeita sync quando a grade não possui tamanhos", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.fichaTecnicaItem.findMany.mockResolvedValue([]);
        prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);
        prisma.gradeVersaoItem.findMany.mockResolvedValue([]);

        await expect(service.syncCoresBatch(1, [30], 10)).rejects.toThrow(
            new BadRequestException("A grade da ficha técnica não possui tamanhos configurados"),
        );
    });

    it("cria um item com sucesso", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findFirst.mockResolvedValue({ id: 30 });
        prisma.gradeVersaoItem.findFirst.mockResolvedValue({ id: 40 });
        prisma.fichaTecnicaItem.create.mockResolvedValue({ id: 1, ...itemDto });

        await expect(service.create(1, itemDto as any, 10)).resolves.toEqual({
            message: "Item adicionado com sucesso",
            data: { id: 1, ...itemDto },
        });
        expect(prisma.fichaTecnicaItem.create).toHaveBeenCalledWith({
            data: {
                ficha_tecnica_id: 1,
                cor_id: 30,
                grade_versao_item_id: 40,
                quantidade: 5,
            },
        });
    });

    it("rejeita criação para ficha inexistente ou de outro fabrico", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(null);

        await expect(service.create(1, itemDto as any, 10)).rejects.toThrow(
            new NotFoundException("Ficha técnica não encontrada"),
        );
        expect(prisma.cor.findFirst).not.toHaveBeenCalled();
    });

    it("rejeita cor que não pertence ao fabrico da ficha", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findFirst.mockResolvedValue(null);

        await expect(service.create(1, itemDto as any, 10)).rejects.toThrow(
            new NotFoundException("Cor não encontrada ou não pertence ao fabrico"),
        );
        expect(prisma.fichaTecnicaItem.create).not.toHaveBeenCalled();
    });

    it("rejeita item de grade que não pertence à versão da ficha", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findFirst.mockResolvedValue({ id: 30 });
        prisma.gradeVersaoItem.findFirst.mockResolvedValue(null);

        await expect(service.create(1, itemDto as any, 10)).rejects.toThrow(
            new BadRequestException("O item de grade não pertence à versão da ficha técnica"),
        );
        expect(prisma.fichaTecnicaItem.create).not.toHaveBeenCalled();
    });

    it("traduz conflito Prisma ao criar item único", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(ficha);
        prisma.cor.findFirst.mockResolvedValue({ id: 30 });
        prisma.gradeVersaoItem.findFirst.mockResolvedValue({ id: 40 });
        prisma.fichaTecnicaItem.create.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.create(1, itemDto as any, 10)).rejects.toThrow(
            new ConflictException("Esse item já existe nesta ficha técnica"),
        );
    });

    describe("replaceMatriz", () => {
        it("retorna 404 sem escritas quando a ficha é excluída antes da releitura", async () => {
            prisma.fichaTecnica.findFirst
                .mockResolvedValueOnce({ ...ficha, pedido_id: 9 })
                .mockResolvedValueOnce(null);
            prisma.$queryRaw = jest.fn().mockResolvedValue([]);
            prisma.pedido = {
                findUnique: jest.fn().mockResolvedValue({ finalizado: false }),
            };
            prisma.fichaTecnica.update = jest.fn();
            const sincronizarParceiros = jest.mocked(fichaTecnicaService.sincronizarFichaParceiros);
            const sincronizarPedido = jest.mocked(fichaTecnicaService.sincronizarPedido);
            sincronizarParceiros.mockClear();
            sincronizarPedido.mockClear();

            await expect(service.replaceMatriz(1, [itemDto], 10)).rejects.toThrow(
                new NotFoundException("Ficha técnica não encontrada"),
            );

            expect(prisma.pedido.findUnique).toHaveBeenCalledWith({
                where: { delete_at: null, id: 9 },
                select: { finalizado: true },
            });
            expect(prisma.fichaTecnica.findFirst).toHaveBeenLastCalledWith(
                expect.objectContaining({ where: { delete_at: null, id: 1, fabrico_id: 10 } }),
            );
            expect(prisma.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
            expect(prisma.fichaTecnicaItem.createMany).not.toHaveBeenCalled();
            expect(prisma.fichaTecnica.update).not.toHaveBeenCalled();
            expect(sincronizarParceiros).not.toHaveBeenCalled();
            expect(sincronizarPedido).not.toHaveBeenCalled();
        });
    });

    describe("ficha concluída", () => {
        const concluida = { ...ficha, concluida: true };
        const atuais = [{ cor_id: 30, grade_versao_item_id: 40, quantidade: 5 }];

        beforeEach(() => {
            prisma.fichaTecnica.findFirst.mockResolvedValue(concluida);
        });

        it("salvar a mesma matriz é eco e não grava", async () => {
            prisma.fichaTecnicaItem.findMany.mockResolvedValue(atuais);

            await expect(
                service.createManyByFichaTecnicaID(1, [itemDto] as any, 10),
            ).resolves.toEqual(expect.objectContaining({ message: "Itens inalterados (eco)" }));
            expect(prisma.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
            expect(prisma.fichaTecnicaItem.createMany).not.toHaveBeenCalled();
        });

        it("salvar matriz diferente dá 409 sem gravar", async () => {
            prisma.fichaTecnicaItem.findMany.mockResolvedValue(atuais);

            await expect(
                service.createManyByFichaTecnicaID(1, [{ ...itemDto, quantidade: 6 }] as any, 10),
            ).rejects.toThrow(ConflictException);
            expect(prisma.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
            expect(prisma.fichaTecnicaItem.createMany).not.toHaveBeenCalled();
        });

        it("sync com o mesmo conjunto de cores é eco", async () => {
            prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ cor_id: 30 }]);

            await expect(service.syncCoresBatch(1, [30], 10)).resolves.toEqual(
                expect.objectContaining({ cores_adicionadas: 0, cores_removidas: 0 }),
            );
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it("sync com conjunto diferente dá 409", async () => {
            prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ cor_id: 30 }]);

            await expect(service.syncCoresBatch(1, [31], 10)).rejects.toThrow(ConflictException);
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it("gerar itens de cor que já tem toda a grade passa; cor nova dá 409", async () => {
            prisma.cor.findFirst.mockResolvedValue({ id: 30 });
            prisma.gradeVersaoItem.findMany.mockResolvedValue([{ id: 40 }]);

            prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ grade_versao_item_id: 40 }]);
            await expect(service.gerarItensPorCor(1, 30, 10)).resolves.toBeDefined();

            prisma.fichaTecnicaItem.findMany.mockResolvedValue([]);
            await expect(service.gerarItensPorCor(1, 30, 10)).rejects.toThrow(ConflictException);
            expect(prisma.fichaTecnicaItem.createMany).not.toHaveBeenCalled();
        });

        it("remover itens de cores ausentes passa; presentes dá 409", async () => {
            prisma.cor.findMany.mockResolvedValue([{ id: 30 }]);

            prisma.fichaTecnicaItem.findMany.mockResolvedValue([]);
            await expect(service.removerCoresBatch(1, [30], 10)).resolves.toEqual(
                expect.objectContaining({ itens_removidos: 0 }),
            );

            prisma.fichaTecnicaItem.findMany.mockResolvedValue([{ id: 1 }]);
            await expect(service.removerCoresBatch(1, [30], 10)).rejects.toThrow(ConflictException);
            expect(prisma.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
        });

        it("limpar itens: dá 409 se houver itens", async () => {
            prisma.fichaTecnicaItem.count = jest.fn().mockResolvedValue(3);

            await expect(service.clearByFichaTecnicaID(1, 10)).rejects.toThrow(ConflictException);
            expect(prisma.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
        });

        it("remove: item com quantidade 0 é eco; com quantidade > 0 dá 409", async () => {
            const spy = jest.spyOn(service, "findOne");

            spy.mockResolvedValue({
                id: 1,
                quantidade: 0,
                ficha_tecnica: { concluida: true },
            } as any);
            await expect(service.remove(1, 10)).resolves.toEqual(
                expect.objectContaining({ message: expect.stringContaining("eco") }),
            );

            spy.mockResolvedValue({
                id: 1,
                quantidade: 5,
                ficha_tecnica: { concluida: true },
            } as any);
            await expect(service.remove(1, 10)).rejects.toThrow(ConflictException);
            expect(prisma.fichaTecnicaItem.delete).not.toHaveBeenCalled();
        });

        it("update: valores iguais é eco; valor diferente dá 409", async () => {
            const atual = {
                id: 1,
                cor_id: 30,
                grade_versao_item_id: 40,
                quantidade: 5,
                ficha_tecnica: { concluida: true },
            };
            jest.spyOn(service, "findOne").mockResolvedValue(atual as any);

            await expect(service.update(1, { quantidade: 5 } as any, 10)).resolves.toBeDefined();
            await expect(service.update(1, { quantidade: 6 } as any, 10)).rejects.toThrow(
                ConflictException,
            );
            expect(prisma.fichaTecnicaItem.update).not.toHaveBeenCalled();
        });
    });
});
