import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { AuthenticatedUser } from "src/auth/types/authenticated-user";
import { EtapaService } from "../etapa/etapa.service";
import { FabricoService } from "../fabrico/fabrico.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";
import { FichaTecnicaService } from "./ficha-tecnica.service";

const mockPrismaService = {
    $transaction: jest.fn(async (callback) => await callback(mockPrismaService)),
    $queryRaw: jest.fn(),
    fichaTecnica: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
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
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    clienteProduto: {
        findMany: jest.fn(),
    },
};

const mockProdutoService = { getById: jest.fn() };
const mockFabricoService = { getById: jest.fn() };
const mockEtapaService = { getById: jest.fn() };

const resetMockState = () => {
    mockPrismaService.$transaction = jest.fn(async (callback) => await callback(mockPrismaService));
    mockPrismaService.$queryRaw = jest.fn();
    mockPrismaService.fichaTecnica = {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
    };
    mockPrismaService.fichaTecnicaItem = { deleteMany: jest.fn() };
    mockPrismaService.produto = { findFirst: jest.fn() };
    mockPrismaService.gradeVersaoItem = { findMany: jest.fn() };
    mockPrismaService.gradeVersao = { findFirst: jest.fn() };
    mockPrismaService.pedido = { findUnique: jest.fn(), update: jest.fn() };
    mockPrismaService.clienteProduto = { findMany: jest.fn() };

    mockProdutoService.getById = jest.fn();
    mockFabricoService.getById = jest.fn();
    mockEtapaService.getById = jest.fn();
};

describe("FichaTecnicaService", () => {
    let service: FichaTecnicaService;
    let prismaService: typeof mockPrismaService;
    let produtoService: typeof mockProdutoService;
    let fabricoService: typeof mockFabricoService;
    let etapaService: typeof mockEtapaService;

    const mockUser: AuthenticatedUser = {
        id: 1,
        fabrico_id: 20,
        email: "user@teste.com",
        nome: "Usuário Teste",
    } as AuthenticatedUser;

    const fichaData = {
        id: 1,
        numero: 1,
        produto_id: 10,
        fabrico_id: 20,
        grade_versao_id: 30,
        etapa_atual_id: 40,
        pedido_id: 100,
        quantidade: 100,
        defeitos_costura: 0,
        defeitos_tecido: 0,
        retiradas: 0,
        sobras: 0,
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
        resetMockState();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FichaTecnicaService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: ProdutoService, useValue: mockProdutoService },
                { provide: FabricoService, useValue: mockFabricoService },
                { provide: EtapaService, useValue: mockEtapaService },
            ],
        }).compile();

        service = module.get<FichaTecnicaService>(FichaTecnicaService);
        prismaService = module.get(PrismaService);
        produtoService = module.get(ProdutoService);
        fabricoService = module.get(FabricoService);
        etapaService = module.get(EtapaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("create", () => {
        const createDto = { produto_id: 10, quantidade: 100 } as any;

        it("deve criar uma ficha técnica com sucesso", async () => {
            produtoService.getById.mockResolvedValue(true);
            fabricoService.getById.mockResolvedValue(true);

            prismaService.produto.findFirst.mockResolvedValue({ grade_versao_id: 30 });
            prismaService.gradeVersaoItem.findMany.mockResolvedValue([{ id: 1 }]);
            prismaService.fichaTecnica.findFirst.mockResolvedValue(null);
            prismaService.fichaTecnica.create.mockResolvedValue(fichaData);

            const result = await service.create(createDto, mockUser);

            expect(result).toEqual(fichaData);
            expect(produtoService.getById).toHaveBeenCalledWith(10, mockUser);
            expect(fabricoService.getById).toHaveBeenCalledWith(20);
            expect(prismaService.fichaTecnica.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    ...createDto,
                    numero: 1,
                    grade_versao_id: 30,
                    produto_id: 10,
                    fabrico_id: 20,
                }),
            });
        });

        it("deve lançar BadRequestException se o usuário não possuir um fabrico_id", async () => {
            const invalidUser = { ...mockUser, fabrico_id: undefined } as any;
            fabricoService.getById.mockRejectedValue(
                new BadRequestException("Usuário não possui um fabrico associado"),
            );

            await expect(service.create(createDto, invalidUser)).rejects.toThrow(
                BadRequestException,
            );
        });

        it("deve lançar NotFoundException se o produto não pertencer ao fabrico", async () => {
            prismaService.produto.findFirst.mockResolvedValue(null);

            await expect(service.create(createDto, mockUser)).rejects.toThrow(NotFoundException);
        });

        it("deve lançar BadRequestException se o produto não tiver grade_versao_id", async () => {
            prismaService.produto.findFirst.mockResolvedValue({ grade_versao_id: null });

            await expect(service.create(createDto, mockUser)).rejects.toThrow(BadRequestException);
        });

        it("deve lançar BadRequestException se a grade não tiver tamanhos configurados", async () => {
            prismaService.produto.findFirst.mockResolvedValue({ grade_versao_id: 30 });
            prismaService.gradeVersaoItem.findMany.mockResolvedValue([]);

            await expect(service.create(createDto, mockUser)).rejects.toThrow(BadRequestException);
        });
    });

    describe("findOne", () => {
        it("deve retornar a ficha quando encontrada", async () => {
            prismaService.fichaTecnica.findUnique.mockResolvedValue(fichaData);

            const result = await service.findOne(1);

            expect(result).toEqual(fichaData);
            expect(prismaService.fichaTecnica.findUnique).toHaveBeenCalled();
        });

        it("deve lançar NotFoundException quando a ficha base não for encontrada", async () => {
            prismaService.fichaTecnica.findUnique.mockResolvedValue(null);

            await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
        });
    });

    describe("update", () => {
        const updateDto = { etapa_atual_id: 40 } as any;

        beforeEach(() => {
            jest.spyOn(service, "findOne").mockResolvedValue(fichaData as any);
            prismaService.produto.findFirst.mockResolvedValue({ id: 10, grade_versao_id: 30 });
        });

        it("deve atualizar a ficha com sucesso", async () => {
            etapaService.getById.mockResolvedValue({ fabrico_id: 20 });
            prismaService.fichaTecnica.update.mockResolvedValue({
                ...fichaData,
                etapa_atual_id: 40,
            });

            const result = await service.update(1, updateDto, mockUser);

            expect(result.etapa_atual_id).toEqual(40);
            expect(prismaService.fichaTecnica.update).toHaveBeenCalled();
            expect(prismaService.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
        });

        it("deve sincronizar o pedido quando a quantidade da ficha for alterada e houver pedido_id", async () => {
            etapaService.getById.mockResolvedValue({ fabrico_id: 20 });
            prismaService.fichaTecnica.update.mockResolvedValue({
                ...fichaData,
                quantidade: 150,
            });

            prismaService.$queryRaw.mockResolvedValue([]);
            prismaService.pedido.findUnique.mockResolvedValue({ cliente_id: 5 });
            prismaService.fichaTecnica.findMany.mockResolvedValue([
                { quantidade: 150, produto: { id: 10, custo_total: 20 } },
            ]);
            prismaService.clienteProduto.findMany.mockResolvedValue([
                { produto_id: 10, preco_padrao: 35 },
            ]);
            prismaService.pedido.update.mockResolvedValue({});

            await service.update(1, { quantidade: 150 }, mockUser);

            expect(prismaService.$queryRaw).toHaveBeenCalled();
            expect(prismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: {
                    quantidade: 150,
                    custo_total: 3000,
                    valor_total: 5250,
                },
            });
        });

        it("deve limpar os itens da ficha se a grade_versao_id for alterada", async () => {
            const updateComGradeDto = { ...updateDto, grade_versao_id: 31 };

            etapaService.getById.mockResolvedValue({ fabrico_id: 20 });
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

        it("deve lançar NotFoundException se a ficha não pertencer ao fabrico do usuário", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue({
                ...fichaData,
                fabrico_id: 999,
            } as any);

            await expect(service.update(1, updateDto, mockUser)).rejects.toThrow(NotFoundException);
        });

        it("deve lançar BadRequestException se tentar alterar o produto_id", async () => {
            await expect(service.update(1, { produto_id: 99 } as any, mockUser)).rejects.toThrow(
                "Não é permitido alterar o produto da ficha",
            );
        });

        it("deve lançar BadRequestException se o produto da ficha não pertencer ao fabrico", async () => {
            prismaService.produto.findFirst.mockResolvedValue(null);

            await expect(service.update(1, updateDto, mockUser)).rejects.toThrow(
                "O produto da ficha não pertence ao fabrico informado",
            );
        });

        it("deve lançar BadRequestException se a etapa for de outro fabrico", async () => {
            etapaService.getById.mockResolvedValue({ fabrico_id: 99 });

            await expect(service.update(1, updateDto, mockUser)).rejects.toThrow(
                "A etapa não pertence ao mesmo fabrico da ficha técnica",
            );
        });

        it("deve lançar BadRequestException se a nova grade for inválida ou inativa", async () => {
            prismaService.gradeVersao.findFirst.mockResolvedValue(null);

            await expect(
                service.update(1, { grade_versao_id: 99 } as any, mockUser),
            ).rejects.toThrow("A nova versão de grade informada é inválida ou está inativa");
        });

        it("deve aceitar um relatório de perdas válido", async () => {
            etapaService.getById.mockResolvedValue({ fabrico_id: 20 });
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
            ).rejects.toThrow(
                "A soma das perdas não pode ser maior que a quantidade da ficha técnica",
            );

            expect(prismaService.fichaTecnica.update).not.toHaveBeenCalled();
        });

        it("deve traduzir a violação atômica da constraint de perdas (P2004)", async () => {
            etapaService.getById.mockResolvedValue({ fabrico_id: 20 });
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
    });

    describe("findAllByFabricoId", () => {
        it("deve retornar lista de fichas por fabrico", async () => {
            prismaService.fichaTecnica.findMany.mockResolvedValue([fichaData]);

            const result = await service.findAllByFabricoId(20);

            expect(result).toEqual([fichaData]);
            expect(prismaService.fichaTecnica.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { fabrico_id: 20, concluida: false },
                }),
            );
        });

        it("deve capturar PrismaClientValidationError e lançar BadRequestException", async () => {
            const prismaError = new Prisma.PrismaClientValidationError("Erro de validação", {
                clientVersion: "7.0.0",
            } as any);

            prismaService.fichaTecnica.findMany.mockRejectedValue(prismaError);

            await expect(service.findAllByFabricoId(20)).rejects.toThrow(BadRequestException);
        });
    });

    describe("findAllByEtapaId", () => {
        it("deve retornar lista de fichas por etapa", async () => {
            prismaService.fichaTecnica.findMany.mockResolvedValue([fichaData]);

            const result = await service.findAllByEtapaId(40);

            expect(result).toEqual([fichaData]);
            expect(prismaService.fichaTecnica.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { etapa_atual_id: 40 },
                }),
            );
        });

        it("deve capturar PrismaClientValidationError e lançar BadRequestException", async () => {
            const prismaError = new Prisma.PrismaClientValidationError("Erro de validação", {
                clientVersion: "7.0.0",
            } as any);

            prismaService.fichaTecnica.findMany.mockRejectedValue(prismaError);

            await expect(service.findAllByEtapaId(40)).rejects.toThrow(BadRequestException);
        });
    });

    describe("remove", () => {
        it("deve remover a ficha com sucesso", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(fichaData as any);
            prismaService.fichaTecnica.delete.mockResolvedValue(fichaData);

            const result = await service.remove(1);

            expect(result).toBe("Ficha técnica excluída com sucesso");
            expect(prismaService.fichaTecnica.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("deve lançar NotFoundException se a ficha não existir", async () => {
            jest.spyOn(service, "findOne").mockRejectedValue(new NotFoundException());

            await expect(service.remove(99)).rejects.toThrow(NotFoundException);
            expect(prismaService.fichaTecnica.delete).not.toHaveBeenCalled();
        });
    });
});
