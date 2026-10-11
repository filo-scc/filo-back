import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TransferenciaEtapaService } from "./transferencia-etapa.service";
import { lockPedidos } from "src/pedido/pedido-finalizacao";

jest.mock("src/pedido/pedido-finalizacao", () => ({
    lockPedidos: jest.fn(),
}));

const { PrismaClientKnownRequestError } = Prisma;

describe("TransferenciaEtapaService", () => {
    let service: TransferenciaEtapaService;
    let prisma: any;
    let produtoService: any;
    let fichaTecnicaService: any;

    const fabricoId = 30;
    const pedidoId = 20;
    const dtoBase = {
        ficha_tecnica_id: 10,
        etapa_origem_id: 1,
        etapa_destino_id: 2,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        prisma = {
            $queryRaw: jest.fn(),
            $transaction: jest.fn(async (callback) => callback(prisma)),
            fichaTecnica: {
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                updateMany: jest.fn(),
                update: jest.fn(),
            },
            fichaTecnicaItem: { aggregate: jest.fn() },
            etapa: { findFirst: jest.fn() },
            fichaEtapa: {
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                findUniqueOrThrow: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
            parceiro: { findFirst: jest.fn() },
            parceiroProduto: { upsert: jest.fn(), findMany: jest.fn() },
            fichaParceiro: { upsert: jest.fn(), findMany: jest.fn() },
        };

        produtoService = {
            bloquearProdutosParaRecalculo: jest.fn(),
            recalcularCustoTotal: jest.fn(),
        };
        fichaTecnicaService = { sincronizarPedido: jest.fn() };

        service = new TransferenciaEtapaService(prisma, produtoService, fichaTecnicaService);

        prisma.fichaTecnica.findFirst.mockResolvedValue({
            id: 10,
            fabrico_id: fabricoId,
            produto_id: 5,
            pedido_id: pedidoId,
            quantidade: 100,
            etapa_atual_id: 1,
        });
        prisma.fichaTecnicaItem.aggregate.mockResolvedValue({ _sum: { quantidade: null } });

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

    describe("repetição da transferência (ficha já na etapa destino)", () => {
        const fichaJaNoDestino = {
            id: 10,
            fabrico_id: fabricoId,
            produto_id: 5,
            pedido_id: pedidoId,
            quantidade: 100,
            etapa_atual_id: 2,
            defeitos_costura: 2,
            defeitos_tecido: 1,
            retiradas: 0,
            sobras: 3,
        };
        const relatorioIgual = {
            defeitos_costura: 2,
            defeitos_tecido: 1,
            retiradas: 0,
            sobras: 3,
        };
        const fichaRetornada = { id: 10, etapa_atual_id: 2 };

        const expectNenhumaEscrita = () => {
            expect(prisma.fichaEtapa.create).not.toHaveBeenCalled();
            expect(prisma.fichaEtapa.update).not.toHaveBeenCalled();
            expect(prisma.fichaTecnica.update).not.toHaveBeenCalled();
            expect(prisma.fichaTecnica.updateMany).not.toHaveBeenCalled();
            expect(prisma.parceiroProduto.upsert).not.toHaveBeenCalled();
            expect(prisma.fichaParceiro.upsert).not.toHaveBeenCalled();
            expect(produtoService.recalcularCustoTotal).not.toHaveBeenCalled();
            expect(fichaTecnicaService.sincronizarPedido).not.toHaveBeenCalled();
        };

        beforeEach(() => {
            prisma.fichaTecnica.findFirst.mockResolvedValue(fichaJaNoDestino);
            prisma.fichaTecnica.findUnique.mockResolvedValue(fichaRetornada);
            // Etapa encerrada por último = origem da transição que levou a ficha ao destino.
            prisma.fichaEtapa.findFirst.mockResolvedValue({ etapa_id: 1 });
            prisma.fichaParceiro.findMany.mockResolvedValue([]);
            prisma.parceiroProduto.findMany.mockResolvedValue([]);
        });

        it("repetição idêntica devolve a ficha sem novo histórico e sem escrever nada", async () => {
            const resultado = await service.transferir(dtoBase as any, fabricoId);

            expect(resultado).toEqual(fichaRetornada);
            expect(prisma.fichaEtapa.findFirst).toHaveBeenCalledWith({
                where: { ficha_tecnica_id: 10, data_fim: { not: null } },
                orderBy: { data_fim: "desc" },
                select: { etapa_id: true },
            });
            expectNenhumaEscrita();
        });

        it("repetição idêntica com relatório igual ao registrado é aceita", async () => {
            const resultado = await service.transferir(
                { ...dtoBase, relatorio: relatorioIgual } as any,
                fabricoId,
            );

            expect(resultado).toEqual(fichaRetornada);
            expectNenhumaEscrita();
        });

        it("rejeita com 409 quando a origem informada difere da usada na transferência original", async () => {
            await expect(
                service.transferir({ ...dtoBase, etapa_origem_id: 7 } as any, fabricoId),
            ).rejects.toThrow(
                new ConflictException(
                    "A etapa de origem informada difere da usada na transferência já realizada para esta etapa",
                ),
            );
            expectNenhumaEscrita();
        });

        it("rejeita com 409 quando não há etapa encerrada que prove a origem da transferência", async () => {
            prisma.fichaEtapa.findFirst.mockResolvedValue(null);

            await expect(service.transferir(dtoBase as any, fabricoId)).rejects.toThrow(
                ConflictException,
            );
            expectNenhumaEscrita();
        });

        it.each([
            ["defeitos_costura", { defeitos_costura: 9 }],
            ["defeitos_tecido", { defeitos_tecido: 9 }],
            ["retiradas", { retiradas: 9 }],
            ["sobras", { sobras: 9 }],
            ["quantidade", { quantidade: 999 }],
        ])("rejeita com 409 quando o relatório difere em %s", async (_campo, alteracao) => {
            await expect(
                service.transferir(
                    { ...dtoBase, relatorio: { ...relatorioIgual, ...alteracao } } as any,
                    fabricoId,
                ),
            ).rejects.toThrow(
                new ConflictException(
                    "O relatório informado difere do já registrado nesta ficha técnica, que já está na etapa de destino",
                ),
            );
            expectNenhumaEscrita();
        });

        it("usa a soma da matriz como quantidade do relatório ao comparar a repetição", async () => {
            prisma.fichaTecnicaItem.aggregate.mockResolvedValue({ _sum: { quantidade: 80 } });

            await expect(
                service.transferir(
                    { ...dtoBase, relatorio: { ...relatorioIgual, quantidade: 100 } } as any,
                    fabricoId,
                ),
            ).rejects.toThrow(ConflictException);

            await expect(
                service.transferir(
                    { ...dtoBase, relatorio: { ...relatorioIgual, quantidade: 80 } } as any,
                    fabricoId,
                ),
            ).resolves.toEqual(fichaRetornada);
        });

        describe("parceiros", () => {
            const parceiroUnico = { parceiro_id: 4, operacao: "Costura", preco: 2.5 };
            const registroParceiro = (
                parceiro_id: number,
                quantidade: number,
                operacao = "Costura",
            ) => ({
                ficha_id: 10,
                parceiro_id,
                operacao,
                quantidade,
                valor: null,
            });
            const vinculo = (parceiro_id: number, preco: string | null) => ({
                produto_id: 5,
                parceiro_id,
                preco: preco === null ? null : new Prisma.Decimal(preco),
            });

            it("parceiro único idêntico ao registrado é repetição válida", async () => {
                prisma.fichaParceiro.findMany.mockResolvedValue([registroParceiro(4, 100)]);
                prisma.parceiroProduto.findMany.mockResolvedValue([vinculo(4, "2.50")]);

                await expect(
                    service.transferir(
                        { ...dtoBase, parceiros: [parceiroUnico] } as any,
                        fabricoId,
                    ),
                ).resolves.toEqual(fichaRetornada);
                expect(prisma.fichaParceiro.findMany).toHaveBeenCalledWith({
                    where: { ficha_id: 10, parceiro_id: { in: [4] } },
                });
                expect(prisma.parceiroProduto.findMany).toHaveBeenCalledWith({
                    where: { produto_id: 5, parceiro_id: { in: [4] } },
                });
                expectNenhumaEscrita();
            });

            it("múltiplos parceiros idênticos aos registrados são repetição válida", async () => {
                prisma.fichaParceiro.findMany.mockResolvedValue([
                    registroParceiro(4, 40),
                    registroParceiro(5, 60),
                ]);
                prisma.parceiroProduto.findMany.mockResolvedValue([
                    vinculo(4, "2.50"),
                    vinculo(5, "3.00"),
                ]);

                await expect(
                    service.transferir(
                        {
                            ...dtoBase,
                            parceiros: [
                                { parceiro_id: 4, operacao: "Costura", preco: 2.5, quantidade: 40 },
                                { parceiro_id: 5, operacao: "Costura", preco: 3, quantidade: 60 },
                            ],
                        } as any,
                        fabricoId,
                    ),
                ).resolves.toEqual(fichaRetornada);
                expectNenhumaEscrita();
            });

            it.each([
                ["parceiro não registrado na ficha", [], [vinculo(4, "2.50")], parceiroUnico],
                ["parceiro sem preço gravado", [registroParceiro(4, 100)], [], parceiroUnico],
                [
                    "preço gravado nulo",
                    [registroParceiro(4, 100)],
                    [vinculo(4, null)],
                    parceiroUnico,
                ],
                [
                    "preço diferente",
                    [registroParceiro(4, 100)],
                    [vinculo(4, "2.50")],
                    { ...parceiroUnico, preco: 2.6 },
                ],
                [
                    "operação diferente",
                    [registroParceiro(4, 100)],
                    [vinculo(4, "2.50")],
                    { ...parceiroUnico, operacao: "Acabamento" },
                ],
                [
                    "quantidade diferente da total (parceiro único)",
                    [registroParceiro(4, 90)],
                    [vinculo(4, "2.50")],
                    parceiroUnico,
                ],
            ])("rejeita com 409: %s", async (_caso, registrados, vinculos, parceiro) => {
                prisma.fichaParceiro.findMany.mockResolvedValue(registrados);
                prisma.parceiroProduto.findMany.mockResolvedValue(vinculos);

                await expect(
                    service.transferir({ ...dtoBase, parceiros: [parceiro] } as any, fabricoId),
                ).rejects.toThrow(
                    new ConflictException(
                        "Os parceiros informados diferem dos já registrados nesta ficha técnica, que já está na etapa de destino",
                    ),
                );
                expectNenhumaEscrita();
            });

            it("rejeita com 409 quando, com vários parceiros, a quantidade de um deles difere", async () => {
                prisma.fichaParceiro.findMany.mockResolvedValue([
                    registroParceiro(4, 40),
                    registroParceiro(5, 60),
                ]);
                prisma.parceiroProduto.findMany.mockResolvedValue([
                    vinculo(4, "2.50"),
                    vinculo(5, "3.00"),
                ]);

                await expect(
                    service.transferir(
                        {
                            ...dtoBase,
                            parceiros: [
                                { parceiro_id: 4, operacao: "Costura", preco: 2.5, quantidade: 50 },
                                { parceiro_id: 5, operacao: "Costura", preco: 3, quantidade: 50 },
                            ],
                        } as any,
                        fabricoId,
                    ),
                ).rejects.toThrow(ConflictException);
                expectNenhumaEscrita();
            });

            it("não confirma parceiro de outra fábrica (mesma resposta de parceiro não registrado)", async () => {
                // O parceiro 99 não tem vínculo com a ficha desta fábrica: nada é encontrado.
                await expect(
                    service.transferir(
                        { ...dtoBase, parceiros: [{ ...parceiroUnico, parceiro_id: 99 }] } as any,
                        fabricoId,
                    ),
                ).rejects.toThrow(ConflictException);
                expectNenhumaEscrita();
            });
        });
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

    it("rejeita quando a soma das perdas excede a quantidade da ficha, antes de qualquer escrita", async () => {
        const dto = {
            ...dtoBase,
            relatorio: { defeitos_costura: 50, defeitos_tecido: 30, retiradas: 20, sobras: 5 },
        };

        await expect(service.transferir(dto as any, fabricoId)).rejects.toThrow(
            new BadRequestException(
                "A soma das perdas não pode ser maior que a quantidade da ficha técnica",
            ),
        );
        expect(prisma.fichaEtapa.update).not.toHaveBeenCalled();
        expect(prisma.fichaEtapa.create).not.toHaveBeenCalled();
        expect(prisma.fichaTecnica.update).not.toHaveBeenCalled();
        expect(fichaTecnicaService.sincronizarPedido).not.toHaveBeenCalled();
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

    it("rejeita destino já percorrido pela ficha (etapas reordenadas) sem escrever nada", async () => {
        // A→B percorrido; depois A foi reordenada para depois de B e a ficha tenta B→A.
        prisma.fichaEtapa.findUnique.mockResolvedValueOnce({ id: 90 });

        await expect(service.transferir(dtoBase as any, fabricoId)).rejects.toThrow(
            ConflictException,
        );

        expect(prisma.fichaEtapa.update).not.toHaveBeenCalled();
        expect(prisma.fichaEtapa.create).not.toHaveBeenCalled();
        expect(prisma.fichaTecnica.update).not.toHaveBeenCalled();
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

    it("atualiza somente as perdas do relatório e NÃO altera a quantidade da ficha", async () => {
        const dto = {
            ...dtoBase,
            relatorio: { defeitos_costura: 2, defeitos_tecido: 1, retiradas: 0, sobras: 3 },
        };

        await service.transferir(dto as any, fabricoId);

        const { data } = prisma.fichaTecnica.update.mock.calls[0][0];
        expect(data).toEqual({
            etapa_atual_id: 2,
            defeitos_costura: 2,
            defeitos_tecido: 1,
            retiradas: 0,
            sobras: 3,
        });
        expect(data).not.toHaveProperty("quantidade");
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
    it("rejeita relatorio.quantidade divergente da quantidade da ficha (fonte é a matriz)", async () => {
        const dto = {
            ...dtoBase,
            relatorio: {
                quantidade: 90,
                defeitos_costura: 2,
                defeitos_tecido: 1,
                retiradas: 0,
                sobras: 3,
            },
        };

        await expect(service.transferir(dto as any, fabricoId)).rejects.toThrow(
            BadRequestException,
        );
        expect(prisma.fichaEtapa.create).not.toHaveBeenCalled();
        expect(prisma.fichaTecnica.update).not.toHaveBeenCalled();
    });

    it("quantidade acompanha a soma da matriz e o pedido é sincronizado", async () => {
        prisma.fichaTecnicaItem.aggregate.mockResolvedValue({ _sum: { quantidade: 90 } });

        await service.transferir(dtoBase as any, fabricoId);

        expect(prisma.fichaTecnica.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ etapa_atual_id: 2, quantidade: 90 }),
            }),
        );
        expect(fichaTecnicaService.sincronizarPedido).toHaveBeenCalledWith(prisma, pedidoId);
    });

    it("matriz zerada (ainda não preenchida) mantém a quantidade atual da ficha", async () => {
        prisma.fichaTecnicaItem.aggregate.mockResolvedValue({ _sum: { quantidade: 0 } });

        await service.transferir(dtoBase as any, fabricoId);

        const { data } = prisma.fichaTecnica.update.mock.calls[0][0];
        expect(data).not.toHaveProperty("quantidade");
    });

    it("parceiro único usa a quantidade derivada da matriz para calcular o valor", async () => {
        prisma.fichaTecnicaItem.aggregate.mockResolvedValue({ _sum: { quantidade: 90 } });
        prisma.parceiro.findFirst.mockResolvedValue({ id: 7, fabrico_id: fabricoId });

        await service.transferir(
            { ...dtoBase, parceiros: [{ parceiro_id: 7, preco: 2 }] } as any,
            fabricoId,
        );

        expect(prisma.fichaParceiro.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({ quantidade: 90, valor: 180 }),
            }),
        );
    });

    it("com parceiros: trava o produto, grava o preço, recalcula o custo e só depois sincroniza o pedido", async () => {
        prisma.parceiro.findFirst.mockResolvedValue({ id: 7, fabrico_id: fabricoId });

        await service.transferir(
            { ...dtoBase, parceiros: [{ parceiro_id: 7, preco: 2.5 }] } as any,
            fabricoId,
        );

        expect(produtoService.bloquearProdutosParaRecalculo).toHaveBeenCalledWith([5], prisma);
        expect(produtoService.recalcularCustoTotal).toHaveBeenCalledWith(5, prisma);

        const ordem = (fn: jest.Mock) => fn.mock.invocationCallOrder[0];
        expect(ordem(produtoService.bloquearProdutosParaRecalculo)).toBeLessThan(
            ordem(prisma.parceiroProduto.upsert),
        );
        expect(ordem(prisma.parceiroProduto.upsert)).toBeLessThan(
            ordem(produtoService.recalcularCustoTotal),
        );
        expect(ordem(produtoService.recalcularCustoTotal)).toBeLessThan(
            ordem(fichaTecnicaService.sincronizarPedido),
        );
    });

    it("sem parceiros: não trava nem recalcula o produto", async () => {
        await service.transferir(dtoBase as any, fabricoId);

        expect(produtoService.bloquearProdutosParaRecalculo).not.toHaveBeenCalled();
        expect(produtoService.recalcularCustoTotal).not.toHaveBeenCalled();
    });

    it("trava o pedido antes da ficha (pedido -> ficha)", async () => {
        await service.transferir(dtoBase as any, fabricoId);

        expect(lockPedidos).toHaveBeenCalledWith(prisma, [pedidoId]);
        expect((lockPedidos as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
            prisma.$queryRaw.mock.invocationCallOrder[0],
        );
    });

    it("rejeita quando o pedido da ficha mudou entre a leitura e a trava", async () => {
        prisma.fichaTecnica.findFirst
            .mockReset()
            .mockResolvedValueOnce({
                id: 10,
                fabrico_id: fabricoId,
                produto_id: 5,
                pedido_id: pedidoId,
                quantidade: 100,
                etapa_atual_id: 1,
            })
            .mockResolvedValueOnce({
                id: 10,
                fabrico_id: fabricoId,
                produto_id: 5,
                pedido_id: 99,
                quantidade: 100,
                etapa_atual_id: 1,
            });

        await expect(service.transferir(dtoBase as any, fabricoId)).rejects.toThrow(
            ConflictException,
        );
        expect(prisma.fichaEtapa.create).not.toHaveBeenCalled();
    });

    it("falha no recálculo do custo impede a atualização da ficha e a sincronização do pedido", async () => {
        prisma.parceiro.findFirst.mockResolvedValue({ id: 7, fabrico_id: fabricoId });
        produtoService.recalcularCustoTotal.mockRejectedValue(new Error("falha no recálculo"));

        await expect(
            service.transferir(
                { ...dtoBase, parceiros: [{ parceiro_id: 7, preco: 2.5 }] } as any,
                fabricoId,
            ),
        ).rejects.toThrow("falha no recálculo");

        expect(prisma.fichaTecnica.update).not.toHaveBeenCalled();
        expect(fichaTecnicaService.sincronizarPedido).not.toHaveBeenCalled();
    });

    it("falha na sincronização do pedido propaga o erro (a transação inteira reverte)", async () => {
        fichaTecnicaService.sincronizarPedido.mockRejectedValue(new Error("falha no pedido"));

        await expect(service.transferir(dtoBase as any, fabricoId)).rejects.toThrow(
            "falha no pedido",
        );
    });
});
