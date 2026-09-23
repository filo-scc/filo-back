import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TransferenciaEtapaService } from "./transferencia-etapa.service";

const { PrismaClientKnownRequestError } = Prisma;

describe("TransferenciaEtapaService", () => {
    let service: TransferenciaEtapaService;
    let prisma: any;

    const fabricoId = 30;
    const dtoBase = {
        ficha_tecnica_id: 10,
        etapa_origem_id: 1,
        etapa_destino_id: 2,
    };

    beforeEach(() => {
        prisma = {
            $queryRaw: jest.fn(),
            $transaction: jest.fn(async (callback) => callback(prisma)),
            fichaTecnica: {
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                updateMany: jest.fn(),
                update: jest.fn(),
            },
            etapa: { findFirst: jest.fn() },
            fichaEtapa: {
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                findUniqueOrThrow: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
            parceiro: { findFirst: jest.fn() },
            parceiroProduto: { upsert: jest.fn() },
            fichaParceiro: { upsert: jest.fn() },
        };

        service = new TransferenciaEtapaService(prisma);

        prisma.fichaTecnica.findFirst.mockResolvedValue({
            id: 10,
            fabrico_id: fabricoId,
            produto_id: 5,
            quantidade: 100,
            etapa_atual_id: 1,
        });
        prisma.etapa.findFirst
            .mockResolvedValueOnce({ id: 1, fabrico_id: fabricoId, ativa: true, ordem: 1 })
            .mockResolvedValueOnce({ id: 2, fabrico_id: fabricoId, ativa: true, ordem: 2 })
            .mockResolvedValueOnce({ id: 2 });
        prisma.fichaEtapa.findFirst.mockResolvedValue({ id: 100, data_fim: null });
        prisma.fichaEtapa.findUnique.mockResolvedValue(null);
        prisma.fichaEtapa.create.mockResolvedValue({ id: 101 });
        prisma.fichaTecnica.update.mockResolvedValue({ id: 10, etapa_atual_id: 2 });
    });

    it("executa o fluxo completo: fecha etapa anterior, cria a nova e atualiza a ficha", async () => {
        const resultado = await service.transferir(dtoBase as any, fabricoId);

        expect(prisma.fichaEtapa.update).toHaveBeenCalledWith({
            where: { id: 100 },
            data: { data_fim: expect.any(Date) },
        });
        expect(prisma.fichaEtapa.create).toHaveBeenCalledWith({
            data: {
                ficha_tecnica_id: 10,
                etapa_id: 2,
                data_inicio: expect.any(Date),
            },
        });
        expect(prisma.fichaTecnica.updateMany).toHaveBeenCalledWith({
            where: { id: 10, produzida_em: null },
            data: { produzida_em: expect.any(Date) },
        });
        expect(prisma.fichaTecnica.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 10 },
                data: expect.objectContaining({ etapa_atual_id: 2 }),
            }),
        );
        expect(resultado).toEqual({ id: 10, etapa_atual_id: 2 });
    });

    it("é idempotente: não repete nada se a ficha já está na etapa destino", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue({
            id: 10,
            fabrico_id: fabricoId,
            produto_id: 5,
            quantidade: 100,
            etapa_atual_id: 2,
        });
        prisma.fichaTecnica.findUnique.mockResolvedValue({ id: 10, etapa_atual_id: 2 });

        const resultado = await service.transferir(dtoBase as any, fabricoId);

        expect(resultado).toEqual({ id: 10, etapa_atual_id: 2 });
        expect(prisma.fichaEtapa.create).not.toHaveBeenCalled();
        expect(prisma.fichaEtapa.update).not.toHaveBeenCalled();
        expect(prisma.fichaTecnica.update).not.toHaveBeenCalled();
    });

    it("rejeita quando a ficha não pertence ao fabrico", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue(null);

        await expect(service.transferir(dtoBase as any, fabricoId)).rejects.toThrow(
            new NotFoundException("Ficha técnica não encontrada"),
        );
        expect(prisma.fichaEtapa.create).not.toHaveBeenCalled();
    });

    it("rejeita quando a etapa_origem_id informada não é a etapa atual da ficha", async () => {
        prisma.fichaTecnica.findFirst.mockResolvedValue({
            id: 10,
            fabrico_id: fabricoId,
            produto_id: 5,
            quantidade: 100,
            etapa_atual_id: 3,
        });

        await expect(service.transferir(dtoBase as any, fabricoId)).rejects.toThrow(
            new BadRequestException(
                "A etapa de origem informada não corresponde à etapa atual da ficha técnica",
            ),
        );

        expect(prisma.etapa.findFirst).not.toHaveBeenCalled();
        expect(prisma.fichaEtapa.update).not.toHaveBeenCalled();
        expect(prisma.fichaEtapa.create).not.toHaveBeenCalled();
        expect(prisma.fichaTecnica.update).not.toHaveBeenCalled();
    });

    it("rejeita quando a etapa destino é de outro fabrico", async () => {
        prisma.etapa.findFirst
            .mockReset()
            .mockResolvedValueOnce({ id: 1, fabrico_id: fabricoId, ativa: true, ordem: 1 })
            .mockResolvedValueOnce(null);

        await expect(service.transferir(dtoBase as any, fabricoId)).rejects.toThrow(
            new BadRequestException("A etapa não pertence ao mesmo fabrico da ficha técnica"),
        );
        expect(prisma.fichaEtapa.create).not.toHaveBeenCalled();
    });

    it("rejeita quando não existe FichaEtapa aberta correspondente à etapa atual da ficha", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue(null);

        await expect(service.transferir(dtoBase as any, fabricoId)).rejects.toThrow(
            new BadRequestException(
                "Não foi encontrada uma etapa em andamento correspondente à ficha técnica",
            ),
        );

        expect(prisma.fichaEtapa.update).not.toHaveBeenCalled();
        expect(prisma.fichaEtapa.create).not.toHaveBeenCalled();
        expect(prisma.fichaTecnica.update).not.toHaveBeenCalled();
    });

    it("rejeita quando a soma das perdas excede a quantidade, antes de abrir a transação", async () => {
        const dtoComPerdasInvalidas = {
            ...dtoBase,
            relatorio: {
                quantidade: 10,
                defeitos_costura: 5,
                defeitos_tecido: 5,
                retiradas: 5,
                sobras: 0,
            },
        };

        await expect(service.transferir(dtoComPerdasInvalidas as any, fabricoId)).rejects.toThrow(
            BadRequestException,
        );
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("falha intermediária: erro ao processar parceiro impede a atualização final da ficha", async () => {
        prisma.parceiro.findFirst.mockResolvedValue(null);

        const dtoComParceiro = {
            ...dtoBase,
            parceiros: [{ parceiro_id: 999, preco: 10 }],
        };

        await expect(service.transferir(dtoComParceiro as any, fabricoId)).rejects.toThrow(
            NotFoundException,
        );

        expect(prisma.parceiroProduto.upsert).not.toHaveBeenCalled();
        expect(prisma.fichaParceiro.upsert).not.toHaveBeenCalled();
        expect(prisma.fichaTecnica.update).not.toHaveBeenCalled();

        expect(prisma.fichaEtapa.create).toHaveBeenCalled();
    });

    it("concorrência: trata P2002 ao criar FichaEtapa buscando o registro já criado pela transação vencedora", async () => {
        prisma.fichaEtapa.create.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );
        const fichaEtapaJaCriada = { id: 555, ficha_tecnica_id: 10, etapa_id: 2 };
        prisma.fichaEtapa.findUniqueOrThrow.mockResolvedValue(fichaEtapaJaCriada);

        const resultado = await service.transferir(dtoBase as any, fabricoId);

        expect(prisma.fichaEtapa.findUniqueOrThrow).toHaveBeenCalledWith({
            where: {
                ficha_tecnica_id_etapa_id: { ficha_tecnica_id: 10, etapa_id: 2 },
            },
        });
        expect(prisma.fichaTecnica.update).toHaveBeenCalled();
        expect(resultado).toEqual({ id: 10, etapa_atual_id: 2 });
    });

    it("repropaga erros do Prisma que não sejam P2002 ao criar FichaEtapa", async () => {
        prisma.fichaEtapa.create.mockRejectedValue(
            new PrismaClientKnownRequestError("fk inválida", {
                code: "P2003",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.transferir(dtoBase as any, fabricoId)).rejects.toThrow(
            PrismaClientKnownRequestError,
        );
        expect(prisma.fichaEtapa.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it("upsert de parceiro único: calcula valor com a quantidade total da ficha", async () => {
        const dtoComUmParceiro = {
            ...dtoBase,
            parceiros: [{ parceiro_id: 7, preco: 2.5, operacao: "Costura completa" }],
        };
        prisma.parceiro.findFirst.mockResolvedValue({ id: 7, fabrico_id: fabricoId });

        await service.transferir(dtoComUmParceiro as any, fabricoId);

        expect(prisma.parceiroProduto.upsert).toHaveBeenCalledWith({
            where: { produto_id_parceiro_id: { produto_id: 5, parceiro_id: 7 } },
            create: { produto_id: 5, parceiro_id: 7, preco: 2.5 },
            update: { preco: 2.5 },
        });
        expect(prisma.fichaParceiro.upsert).toHaveBeenCalledWith({
            where: { ficha_id_parceiro_id: { ficha_id: 10, parceiro_id: 7 } },
            create: {
                ficha_id: 10,
                parceiro_id: 7,
                operacao: "Costura completa",
                quantidade: 100,
                valor: 250,
            },
            update: {
                operacao: "Costura completa",
                quantidade: 100,
                valor: 250,
            },
        });
    });

    it("upsert de múltiplos parceiros: usa quantidade individual e não calcula valor", async () => {
        const dtoComDoisParceiros = {
            ...dtoBase,
            parceiros: [
                { parceiro_id: 7, preco: 2.5, quantidade: 40, operacao: "Corte" },
                { parceiro_id: 8, preco: 3.0, quantidade: 60, operacao: "Costura" },
            ],
        };
        prisma.parceiro.findFirst
            .mockResolvedValueOnce({ id: 7, fabrico_id: fabricoId })
            .mockResolvedValueOnce({ id: 8, fabrico_id: fabricoId });

        await service.transferir(dtoComDoisParceiros as any, fabricoId);

        expect(prisma.fichaParceiro.upsert).toHaveBeenNthCalledWith(1, {
            where: { ficha_id_parceiro_id: { ficha_id: 10, parceiro_id: 7 } },
            create: {
                ficha_id: 10,
                parceiro_id: 7,
                operacao: "Corte",
                quantidade: 40,
                valor: undefined,
            },
            update: {
                operacao: "Corte",
                quantidade: 40,
                valor: undefined,
            },
        });
        expect(prisma.fichaParceiro.upsert).toHaveBeenNthCalledWith(2, {
            where: { ficha_id_parceiro_id: { ficha_id: 10, parceiro_id: 8 } },
            create: {
                ficha_id: 10,
                parceiro_id: 8,
                operacao: "Costura",
                quantidade: 60,
                valor: undefined,
            },
            update: {
                operacao: "Costura",
                quantidade: 60,
                valor: undefined,
            },
        });
    });

    it("atualiza o relatório de acabamento junto com a etapa quando informado", async () => {
        const dtoComRelatorio = {
            ...dtoBase,
            relatorio: {
                quantidade: 90,
                defeitos_costura: 2,
                defeitos_tecido: 1,
                retiradas: 0,
                sobras: 3,
            },
        };

        await service.transferir(dtoComRelatorio as any, fabricoId);

        expect(prisma.fichaTecnica.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    etapa_atual_id: 2,
                    quantidade: 90,
                    defeitos_costura: 2,
                    defeitos_tecido: 1,
                    retiradas: 0,
                    sobras: 3,
                }),
            }),
        );
    });

    it("não marca produzida_em quando a etapa destino não é a última etapa ativa", async () => {
        prisma.etapa.findFirst
            .mockReset()
            .mockResolvedValueOnce({ id: 1, fabrico_id: fabricoId, ativa: true, ordem: 1 })
            .mockResolvedValueOnce({ id: 2, fabrico_id: fabricoId, ativa: true, ordem: 2 })
            .mockResolvedValueOnce({ id: 5 });

        await service.transferir(dtoBase as any, fabricoId);

        expect(prisma.fichaTecnica.updateMany).not.toHaveBeenCalled();
    });
});
