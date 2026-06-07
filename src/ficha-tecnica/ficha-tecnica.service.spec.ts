import { Test, TestingModule } from "@nestjs/testing";
import { FichaTecnicaService } from "./ficha-tecnica.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";
import { FabricoService } from "../fabrico/fabrico.service";
import { EtapaService } from "../etapa/etapa.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

const mockPrismaService = {
    $transaction: jest.fn(async (callback) => await callback(mockPrismaService)),
    fichaTecnica: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
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
};

const mockProdutoService = { getById: jest.fn() };
const mockFabricoService = { getById: jest.fn() };
const mockEtapaService = { getById: jest.fn() };

describe("FichaTecnicaService", () => {
    let service: FichaTecnicaService;
    let prismaService: typeof mockPrismaService;
    let produtoService: typeof mockProdutoService;
    let fabricoService: typeof mockFabricoService;
    let etapaService: typeof mockEtapaService;

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
        const createDto = { produto_id: 10, fabrico_id: 20 } as any;

        it("deve criar uma ficha técnica com sucesso", async () => {
            produtoService.getById.mockResolvedValue(true);
            fabricoService.getById.mockResolvedValue(true);

            prismaService.produto.findFirst.mockResolvedValue({ grade_versao_id: 30 });
            prismaService.gradeVersaoItem.findMany.mockResolvedValue([{ id: 1 }]);
            prismaService.fichaTecnica.create.mockResolvedValue(fichaData);

            const result = await service.create(createDto);

            expect(result).toEqual(fichaData);
            expect(prismaService.fichaTecnica.create).toHaveBeenCalled();
        });

        it("deve lançar NotFoundException se o produto não pertencer ao fabrico", async () => {
            prismaService.produto.findFirst.mockResolvedValue(null);

            await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
            await expect(service.create(createDto)).rejects.toThrow(
                "Produto não encontrado para este fabrico",
            );
        });

        it("deve lançar BadRequestException se o produto não tiver grade_versao_id", async () => {
            prismaService.produto.findFirst.mockResolvedValue({ grade_versao_id: null });

            await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
            await expect(service.create(createDto)).rejects.toThrow(
                "Produto não possui grade definida",
            );
        });

        it("deve lançar BadRequestException se a grade não tiver tamanhos configurados", async () => {
            prismaService.produto.findFirst.mockResolvedValue({ grade_versao_id: 30 });
            prismaService.gradeVersaoItem.findMany.mockResolvedValue([]);

            await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
            await expect(service.create(createDto)).rejects.toThrow(
                "Grade sem tamanhos configurados",
            );
        });
    });

    describe("findOne", () => {
        it("deve retornar a ficha quando encontrada", async () => {
            prismaService.fichaTecnica.findUnique.mockResolvedValue(fichaData);
            const result = await service.findOne(1);
            expect(result).toEqual(fichaData);
        });

        it("deve lançar NotFoundException quando não encontrada", async () => {
            prismaService.fichaTecnica.findUnique.mockResolvedValue(null);
            await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
        });
    });

    describe("update", () => {
        const updateDto = { fabrico_id: 20, etapa_atual_id: 40 } as any;

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

            const result = await service.update(1, updateDto);

            expect(result.etapa_atual_id).toEqual(40);
            expect(prismaService.fichaTecnica.update).toHaveBeenCalled();
            expect(prismaService.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
        });

        it("deve limpar os itens da ficha se a grade_versao_id for alterada", async () => {
            const updateComGradeDto = { ...updateDto, grade_versao_id: 31 };

            etapaService.getById.mockResolvedValue({ fabrico_id: 20 });
            prismaService.gradeVersao.findFirst.mockResolvedValue({ id: 31, grade_id: 5 });
            prismaService.fichaTecnica.update.mockResolvedValue({
                ...fichaData,
                grade_versao_id: 31,
            });

            await service.update(1, updateComGradeDto);

            expect(prismaService.fichaTecnicaItem.deleteMany).toHaveBeenCalledWith({
                where: { ficha_tecnica_id: 1 },
            });
            expect(prismaService.fichaTecnica.update).toHaveBeenCalled();
        });

        it("deve lançar BadRequestException se tentar alterar o produto_id", async () => {
            await expect(service.update(1, { produto_id: 99 } as any)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.update(1, { produto_id: 99 } as any)).rejects.toThrow(
                "Não é permitido alterar o produto da ficha",
            );
        });

        it("deve lançar BadRequestException se o produto não pertencer ao novo fabrico", async () => {
            prismaService.produto.findFirst.mockResolvedValue(null);

            await expect(service.update(1, { fabrico_id: 21 } as any)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.update(1, { fabrico_id: 21 } as any)).rejects.toThrow(
                "O produto da ficha não pertence ao fabrico informado",
            );
        });

        it("deve lançar BadRequestException se a etapa for de outro fabrico", async () => {
            etapaService.getById.mockResolvedValue({ fabrico_id: 99 }); // Etapa de OUTRO fabrico

            await expect(service.update(1, updateDto)).rejects.toThrow(BadRequestException);
            await expect(service.update(1, updateDto)).rejects.toThrow(
                "A etapa não pertence ao mesmo fabrico da ficha técnica",
            );
        });

        it("deve lançar BadRequestException se a nova grade for inválida/inativa", async () => {
            prismaService.gradeVersao.findFirst.mockResolvedValue(null);

            await expect(service.update(1, { grade_versao_id: 99 } as any)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.update(1, { grade_versao_id: 99 } as any)).rejects.toThrow(
                "A nova versão de grade informada é inválida ou está inativa",
            );
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

    describe("findAllByFabricoId", () => {
        it("deve retornar lista de fichas por fabrico", async () => {
            prismaService.fichaTecnica.findMany.mockResolvedValue([fichaData]);
            const result = await service.findAllByFabricoId(20);
            expect(result).toEqual([fichaData]);
        });

        it("deve capturar PrismaClientValidationError e lançar BadRequestException", async () => {
            const prismaError = new Error("Erro de validação");

            Object.setPrototypeOf(prismaError, Prisma.PrismaClientValidationError.prototype);

            prismaService.fichaTecnica.findMany.mockRejectedValue(prismaError);

            await expect(service.findAllByFabricoId(20)).rejects.toThrow(BadRequestException);
        });
    });

    describe("findAllByEtapaId", () => {
        it("deve retornar lista de fichas por etapa", async () => {
            prismaService.fichaTecnica.findMany.mockResolvedValue([fichaData]);
            const result = await service.findAllByEtapaId(40);
            expect(result).toEqual([fichaData]);
        });
    });
});
