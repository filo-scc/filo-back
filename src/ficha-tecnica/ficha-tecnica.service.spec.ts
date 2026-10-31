import { Test, TestingModule } from "@nestjs/testing";
import { FichaTecnicaService } from "./ficha-tecnica.service";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

const mockPrismaService = {
    $transaction: jest.fn(async (callback) => await callback(mockPrismaService)),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn().mockResolvedValue(1),
    fichaTecnica: {
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
    fichaTecnicaItem: {
        deleteMany: jest.fn(),
    },
    produto: {
        findFirst: jest.fn(),
    },
    gradeVersaoItem: {
        findMany: jest.fn(),
    },
    gradeVersao: {
        findFirst: jest.fn(),
    },
    pedido: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    },
    clienteProduto: {
        findMany: jest.fn(),
    },
    fichaParceiro: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
    },
    parceiroProduto: {
        findUnique: jest.fn(),
    },
};

const mockUser = { fabrico_id: 20 } as AuthenticatedUser;

describe("FichaTecnicaService", () => {
    let service: FichaTecnicaService;
    let prismaService: typeof mockPrismaService;

    // Dados base para reuso
    const fichaData = {
        id: 1,
        produto_id: 10,
        fabrico_id: 20,
        grade_versao_id: 30,
        etapa_atual_id: 40,
        produto: {
            id: 10,
            nome: "Produto Teste",
            parceiro_produto: [],
        },
        ficha_parceiro: [],
        pedido: {
            id: 100,
            data_prevista: new Date(),
            cor: "#ffffff",
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FichaTecnicaService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<FichaTecnicaService>(FichaTecnicaService);
        prismaService = module.get(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("findOne", () => {
        it("deve retornar a ficha quando encontrada", async () => {
            prismaService.fichaTecnica.findFirst
                .mockResolvedValueOnce({ produto_id: fichaData.produto_id }) // fichaBase
                .mockResolvedValueOnce(fichaData);
            const result = await service.findOne(1, 20);
            expect(result).toEqual(fichaData);
        });

        it("deve lançar NotFoundException quando não encontrada", async () => {
            prismaService.fichaTecnica.findFirst.mockResolvedValue(null);
            await expect(service.findOne(99, 20)).rejects.toThrow(NotFoundException);
        });
    });

    describe("update", () => {
        const updateDto = { observacoes: "Obs atualizada" } as any;

        beforeEach(() => {
            jest.spyOn(service, "findOne").mockResolvedValue(fichaData as any);
            prismaService.produto.findFirst.mockResolvedValue({ id: 10, grade_versao_id: 30 });
            prismaService.fichaTecnica.findUnique.mockResolvedValue({
                concluida: false,
                grade_versao_id: 30,
                quantidade: 10,
            });
        });

        it("deve atualizar a ficha com sucesso", async () => {
            prismaService.fichaTecnica.update.mockResolvedValue({ ...fichaData });

            await service.update(1, updateDto, mockUser);

            expect(prismaService.fichaTecnica.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 1 },
                    data: expect.objectContaining({
                        observacoes: "Obs atualizada",
                        fabrico_id: 20,
                    }),
                }),
            );
            expect(prismaService.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
        });

        it("deve finalizar o pedido ao concluir a última ficha pendente", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue({
                ...fichaData,
                pedido_id: 100,
                concluida: false,
            } as any);
            prismaService.pedido.findFirst.mockResolvedValue({ id: 100, finalizado: false });
            prismaService.fichaTecnica.update.mockResolvedValue({
                ...fichaData,
                pedido_id: 100,
                concluida: true,
            });
            prismaService.fichaTecnica.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
            prismaService.pedido.updateMany.mockResolvedValue({ count: 1 });

            await service.update(1, { concluida: true } as any, mockUser);

            expect(prismaService.pedido.updateMany).toHaveBeenCalledWith({
                where: { delete_at: null, id: 100, finalizado: false },
                data: { finalizado: true },
            });
        });

        it("deve limpar os itens da ficha se a grade_versao_id for alterada", async () => {
            const updateComGradeDto = { ...updateDto, grade_versao_id: 31 };

            prismaService.gradeVersao.findFirst.mockResolvedValue({ id: 31, grade_id: 5 });
            prismaService.fichaTecnica.update.mockResolvedValue({
                ...fichaData,
                grade_versao_id: 31,
            });

            await service.update(1, updateComGradeDto, mockUser);

            expect(prismaService.fichaTecnicaItem.deleteMany).toHaveBeenCalledWith({
                where: { ficha_tecnica_id: 1 },
            });
            expect(prismaService.fichaTecnica.update).toHaveBeenCalled();
        });

        it("troca de grade zera a quantidade e reconcilia os parceiros", async () => {
            prismaService.gradeVersao.findFirst.mockResolvedValue({ id: 31, grade_id: 5 });
            prismaService.fichaTecnica.update.mockResolvedValue({
                ...fichaData,
                grade_versao_id: 31,
                quantidade: 0,
            });
            prismaService.fichaParceiro.findMany.mockResolvedValueOnce([
                { parceiro_id: 1, quantidade: 5 },
                { parceiro_id: 2, quantidade: 7 },
            ]);

            await service.update(1, { grade_versao_id: 31 } as any, mockUser);

            expect(prismaService.fichaTecnica.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ grade_versao_id: 31, quantidade: 0 }),
                }),
            );
            expect(prismaService.fichaParceiro.findMany).toHaveBeenCalled();
        });

        it("deve lançar BadRequestException se tentar alterar o produto_id", async () => {
            await expect(service.update(1, { produto_id: 99 } as any, mockUser)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.update(1, { produto_id: 99 } as any, mockUser)).rejects.toThrow(
                "Não é permitido alterar o produto da ficha",
            );
        });

        it("deve lançar BadRequestException se o produto não pertencer ao novo fabrico", async () => {
            prismaService.produto.findFirst.mockResolvedValue(null);

            await expect(service.update(1, { fabrico_id: 21 } as any, mockUser)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.update(1, { fabrico_id: 21 } as any, mockUser)).rejects.toThrow(
                "O produto da ficha não pertence ao fabrico informado",
            );
        });

        it("deve lançar BadRequestException se a nova grade for inválida/inativa", async () => {
            prismaService.gradeVersao.findFirst.mockResolvedValue(null);
            await expect(
                service.update(1, { grade_versao_id: 99 } as any, mockUser),
            ).rejects.toThrow(BadRequestException);
            await expect(
                service.update(1, { grade_versao_id: 99 } as any, mockUser),
            ).rejects.toThrow("A nova versão de grade informada é inválida ou está inativa");
        });

        it("deve aceitar um relatório de perdas válido", async () => {
            prismaService.fichaTecnica.update.mockResolvedValue({
                ...fichaData,
                quantidade: 100,
                defeitos_costura: 10,
                defeitos_tecido: 5,
                retiradas: 3,
                sobras: 2,
            });

            const result = await service.update(
                1,
                {
                    quantidade: 100,
                    defeitos_costura: 10,
                    defeitos_tecido: 5,
                    retiradas: 3,
                    sobras: 2,
                } as any,
                mockUser,
            );

            expect(result.defeitos_costura).toBe(10);
        });

        it("deve tratar perda explicitamente nula como zero durante a atualização", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue({
                ...fichaData,
                quantidade: 100,
                defeitos_costura: 90,
                defeitos_tecido: 0,
                retiradas: 0,
                sobras: 0,
            } as any);
            prismaService.fichaTecnica.update.mockResolvedValue({
                ...fichaData,
                quantidade: 20,
                defeitos_costura: null,
            });

            await expect(
                service.update(1, { quantidade: 20, defeitos_costura: null } as any, mockUser),
            ).resolves.toEqual(expect.objectContaining({ quantidade: 20, defeitos_costura: null }));
            expect(prismaService.fichaTecnica.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        quantidade: 20,
                        defeitos_costura: null,
                    }),
                }),
            );
        });

        it("deve rejeitar quando a soma das perdas ultrapassar a quantidade", async () => {
            await expect(
                service.update(
                    1,
                    {
                        quantidade: 10,
                        defeitos_costura: 4,
                        defeitos_tecido: 3,
                        retiradas: 2,
                        sobras: 2,
                    } as any,
                    mockUser,
                ),
            ).rejects.toThrow("A soma das perdas não pode ser maior que a quantidade");

            expect(prismaService.fichaTecnica.update).not.toHaveBeenCalled();
        });

        it("deve traduzir a violação atômica da constraint de perdas", async () => {
            prismaService.fichaTecnica.update.mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError("constraint violada", {
                    code: "P2004",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(service.update(1, { quantidade: 100 } as any, mockUser)).rejects.toThrow(
                "A soma das perdas não pode ser maior que a quantidade da ficha técnica",
            );
        });

        it("ignora etapa_atual_id no payload (só a transferência altera a etapa)", async () => {
            prismaService.fichaTecnica.update.mockResolvedValue({ ...fichaData });

            await service.update(1, { observacoes: "x", etapa_atual_id: 99 } as any, mockUser);

            const { data } = prismaService.fichaTecnica.update.mock.calls[0][0];
            expect(data).not.toHaveProperty("etapa_atual_id");
        });

        describe("ficha concluída", () => {
            const concluida = {
                ...fichaData,
                concluida: true,
                quantidade: 10,
                observacoes: null,
                ficha_tecnica_itens: [],
            };

            it("alteração dá 409 sem gravar", async () => {
                jest.spyOn(service, "findOne").mockResolvedValue(concluida as any);

                await expect(
                    service.update(1, { quantidade: 11 } as any, mockUser),
                ).rejects.toThrow(ConflictException);
                expect(prismaService.fichaTecnica.update).not.toHaveBeenCalled();
            });

            it("reenvio idêntico passa e não grava", async () => {
                jest.spyOn(service, "findOne").mockResolvedValue(concluida as any);

                await expect(
                    service.update(1, { quantidade: 10 } as any, mockUser),
                ).resolves.toEqual(concluida);
                expect(prismaService.fichaTecnica.update).not.toHaveBeenCalled();
            });
        });

        it("um parceiro: acompanha a quantidade e recalcula o valor", async () => {
            prismaService.fichaTecnica.update.mockResolvedValue({ ...fichaData, quantidade: 20 });
            prismaService.fichaParceiro.findMany.mockResolvedValueOnce([
                { parceiro_id: 1, quantidade: 5 },
            ]);
            prismaService.parceiroProduto.findUnique.mockResolvedValue({ preco: 10 });

            await service.update(1, { quantidade: 20 } as any, mockUser);

            expect(prismaService.fichaParceiro.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ quantidade: 20 }) }),
            );
        });

        it("vários parceiros, um sem quantidade: zera todos", async () => {
            prismaService.fichaTecnica.update.mockResolvedValue({ ...fichaData, quantidade: 20 });
            prismaService.fichaParceiro.findMany.mockResolvedValueOnce([
                { parceiro_id: 1, quantidade: 5 },
                { parceiro_id: 2, quantidade: 0 },
            ]);

            await service.update(1, { quantidade: 20 } as any, mockUser);

            expect(prismaService.fichaParceiro.updateMany).toHaveBeenCalledWith({
                where: { ficha_id: 1 },
                data: { quantidade: 0, valor: 0 },
            });
        });

        it("vários parceiros, todos com quantidade: preserva", async () => {
            prismaService.fichaTecnica.update.mockResolvedValue({ ...fichaData, quantidade: 20 });
            prismaService.fichaParceiro.findMany.mockResolvedValueOnce([
                { parceiro_id: 1, quantidade: 5 },
                { parceiro_id: 2, quantidade: 7 },
            ]);

            await service.update(1, { quantidade: 20 } as any, mockUser);

            expect(prismaService.fichaParceiro.updateMany).not.toHaveBeenCalled();
        });
    });

    describe("findAllByFabricoId", () => {
        it("deve retornar lista de fichas por fabrico", async () => {
            prismaService.fichaTecnica.findMany.mockResolvedValue([fichaData]);
            const result = await service.findAllByFabricoId(20);

            expect(result).toEqual([fichaData]);
            expect(prismaService.fichaTecnica.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        delete_at: null,
                        pedido: { delete_at: null },
                        fabrico_id: 20,
                        concluida: false,
                    },
                    include: expect.objectContaining({
                        ficha_parceiro: {
                            include: {
                                parceiro: true,
                            },
                        },
                    }),
                }),
            );
        });

        it("deve capturar PrismaClientValidationError e lançar BadRequestException", async () => {
            const prismaError = new Error("Erro de validação");

            Object.setPrototypeOf(prismaError, Prisma.PrismaClientValidationError.prototype);

            prismaService.fichaTecnica.findMany.mockRejectedValue(prismaError);

            await expect(service.findAllByFabricoId(20)).rejects.toThrow(BadRequestException);
        });
    });

    describe("remove", () => {
        it("deve remover a ficha com sucesso", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue({
                ...fichaData,
                concluida: false,
            } as any);

            const result = await service.remove(1, mockUser);

            expect(result).toBe("Ficha técnica excluída com sucesso");
            expect(prismaService.fichaTecnica.updateMany).toHaveBeenCalledWith({
                where: { id: 1, concluida: false, delete_at: null },
                data: { delete_at: expect.any(Date) },
            });
        });

        it("deve lançar NotFoundException se a ficha não existir", async () => {
            jest.spyOn(service, "findOne").mockRejectedValue(new NotFoundException());

            await expect(service.remove(99, mockUser)).rejects.toThrow(NotFoundException);
            expect(prismaService.fichaTecnica.updateMany).not.toHaveBeenCalled();
        });

        it("recusa com 409 ficha concluída sem apagar", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue({
                ...fichaData,
                concluida: true,
            } as any);

            await expect(service.remove(1, mockUser)).rejects.toThrow(ConflictException);
            expect(prismaService.fichaTecnica.updateMany).not.toHaveBeenCalled();
        });

        it("recusa com 409 se a ficha foi concluída entre a leitura e a exclusão", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue({
                ...fichaData,
                concluida: false,
            } as any);
            prismaService.fichaTecnica.updateMany.mockResolvedValueOnce({ count: 0 });

            await expect(service.remove(1, mockUser)).rejects.toThrow(ConflictException);
        });
    });

    describe("findAllByEtapaId", () => {
        it("deve retornar lista de fichas por etapa", async () => {
            prismaService.fichaTecnica.findMany.mockResolvedValue([fichaData]);
            const result = await service.findAllByEtapaId(40, 20);
            expect(result).toEqual([fichaData]);
        });

        it("deve capturar PrismaClientValidationError e lançar BadRequestException", async () => {
            const prismaError = new Error("Erro de validação");
            Object.setPrototypeOf(prismaError, Prisma.PrismaClientValidationError.prototype);

            prismaService.fichaTecnica.findMany.mockRejectedValue(prismaError);

            await expect(service.findAllByEtapaId(40, 20)).rejects.toThrow(BadRequestException);
        });
    });
});
