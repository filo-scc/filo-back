import { Test, TestingModule } from "@nestjs/testing";
import { EtapaService } from "./etapa.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

const mockPrismaService = {
    etapa: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },
    icone: {
        findUnique: jest.fn(),
    },
};

describe("EtapaService", () => {
    let service: EtapaService;
    let prismaService: typeof mockPrismaService;
    let etapaData: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [EtapaService, { provide: PrismaService, useValue: mockPrismaService }],
        }).compile();

        service = module.get<EtapaService>(EtapaService);
        prismaService = module.get(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks(); // Alterado para afterEach para limpar após CADA teste
    });

    beforeAll(() => {
        etapaData = {
            id: 1,
            fabrico_id: 1,
            nome: "costura",
            descricao: "etapa importante",
            ordem: 1,
            ativa: true,
            icone_id: 99,
        };
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("create", () => {
        it("deve criar uma etapa com sucesso quando o icone_id enviado existir", async () => {
            const { ...createDto } = etapaData;
            prismaService.icone.findUnique.mockResolvedValue({ id: 99, nome: "icone-teste" });
            prismaService.etapa.create.mockResolvedValue(etapaData);

            const resultado = await service.create(createDto);

            expect(resultado).toEqual(etapaData);
            expect(prismaService.icone.findUnique).toHaveBeenCalledWith({ where: { id: 99 } });
        });

        it("deve lançar NotFoundException se o icone_id enviado não existir", async () => {
            const { ...createDto } = etapaData;
            prismaService.icone.findUnique.mockResolvedValue(null);

            await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
            await expect(service.create(createDto)).rejects.toThrow("Ícone não encontrado");
            expect(prismaService.etapa.create).not.toHaveBeenCalled();
        });

        it("deve lançar ConflictException quando violar restrição única (Erro P2002)", async () => {
            const { ...createDto } = etapaData;
            prismaService.icone.findUnique.mockResolvedValue({ id: 99 });

            const prismaError = new Prisma.PrismaClientKnownRequestError("Erro", {
                code: "P2002",
                clientVersion: "4.x",
            });
            prismaService.etapa.create.mockRejectedValue(prismaError);

            await expect(service.create(createDto)).rejects.toThrow(ConflictException);
            await expect(service.create(createDto)).rejects.toThrow("Etapa já cadastrada");
        });

        it("deve lançar NotFoundException se falhar chave estrangeira no momento de criar (Erro P2003)", async () => {
            const { ...createDto } = etapaData;
            prismaService.icone.findUnique.mockResolvedValue({ id: 99 });

            const prismaError = new Prisma.PrismaClientKnownRequestError("Erro", {
                code: "P2003",
                clientVersion: "4.x",
            });
            prismaService.etapa.create.mockRejectedValue(prismaError);

            await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
            await expect(service.create(createDto)).rejects.toThrow("Ícone não encontrado");
        });
    });

    describe("findAllByFabricoID", () => {
        it("deve retornar uma lista de etapas por fabrico_id", async () => {
            prismaService.etapa.findMany.mockResolvedValue([etapaData]);

            const resultado = await service.findAllByFabricoID(1);

            expect(resultado).toEqual([etapaData]);
            expect(prismaService.etapa.findMany).toHaveBeenCalledWith({ where: { fabrico_id: 1 } });
        });

        it("deve lançar PrismaClientKnownRequestError se o Prisma retornar um KnownRequestError", async () => {
            const prismaError = new Prisma.PrismaClientKnownRequestError("Erro", {
                code: "P2000",
                clientVersion: "4.x",
            });
            prismaService.etapa.findMany.mockRejectedValue(prismaError);

            await expect(service.findAllByFabricoID(1)).rejects.toThrow(
                Prisma.PrismaClientKnownRequestError,
            );
            await expect(service.findAllByFabricoID(1)).rejects.toThrow("Erro");
        });

        it("deve lançar PrismaClientValidationError se o Prisma retornar um ValidationError", async () => {
            const prismaError = new Prisma.PrismaClientValidationError("Erro de validação", {
                clientVersion: "4.x",
            });
            prismaService.etapa.findMany.mockRejectedValue(prismaError);

            await expect(service.findAllByFabricoID(1)).rejects.toThrow(
                Prisma.PrismaClientValidationError,
            );
            await expect(service.findAllByFabricoID(1)).rejects.toThrow("Erro de validação");
        });
    });

    describe("getAll", () => {
        it("deve retornar todas as etapas", async () => {
            prismaService.etapa.findMany.mockResolvedValue([etapaData]);
            const resultado = await service.getAll();
            expect(resultado).toEqual([etapaData]);
        });
    });

    describe("getById", () => {
        it("deve retornar a etapa quando encontrada", async () => {
            prismaService.etapa.findUnique.mockResolvedValue(etapaData);
            const resultado = await service.getById(1);
            expect(resultado).toEqual(etapaData);
        });

        it("deve lançar NotFoundException quando a etapa não existir", async () => {
            prismaService.etapa.findUnique.mockResolvedValue(null);
            await expect(service.getById(99)).rejects.toThrow(NotFoundException);
        });
    });

    describe("update", () => {
        it("deve atualizar a etapa com sucesso sem alterar o icone_id", async () => {
            prismaService.etapa.findUnique.mockResolvedValue(etapaData); // Mock do getById
            prismaService.etapa.update.mockResolvedValue({ ...etapaData, nome: "novo nome" });

            const resultado = await service.update(1, { nome: "novo nome" });

            expect(resultado.nome).toEqual("novo nome");
            expect(prismaService.icone.findUnique).not.toHaveBeenCalled(); // Não deve validar ícone
            expect(prismaService.etapa.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { nome: "novo nome" },
            });
        });

        it("deve atualizar a etapa validando o novo icone_id", async () => {
            prismaService.etapa.findUnique.mockResolvedValue(etapaData);
            prismaService.icone.findUnique.mockResolvedValue({ id: 88 });
            prismaService.etapa.update.mockResolvedValue({ ...etapaData, icone_id: 88 });

            const resultado = await service.update(1, { icone_id: 88 });

            expect(resultado.icone_id).toEqual(88);
            expect(prismaService.icone.findUnique).toHaveBeenCalledWith({ where: { id: 88 } });
        });

        it("deve lançar NotFoundException se tentar atualizar com um icone_id inexistente", async () => {
            prismaService.etapa.findUnique.mockResolvedValue(etapaData);
            prismaService.icone.findUnique.mockResolvedValue(null);

            await expect(service.update(1, { icone_id: 88 })).rejects.toThrow(NotFoundException);
            expect(prismaService.etapa.update).not.toHaveBeenCalled();
        });

        it("deve lançar NotFoundException se a etapa não existir", async () => {
            prismaService.etapa.findUnique.mockResolvedValue(null);
            await expect(service.update(99, { nome: "novo" })).rejects.toThrow(NotFoundException);
        });

        // Testes de erros do Prisma na atualização
        it("deve lançar ConflictException ao dar erro P2002", async () => {
            prismaService.etapa.findUnique.mockResolvedValue(etapaData);
            const prismaError = new Prisma.PrismaClientKnownRequestError("Erro", {
                code: "P2002",
                clientVersion: "4.x",
            });
            prismaService.etapa.update.mockRejectedValue(prismaError);

            await expect(service.update(1, { nome: "teste" })).rejects.toThrow(ConflictException);
        });

        it("deve lançar NotFoundException ao dar erro P2003 (Relacionamento inválido)", async () => {
            prismaService.etapa.findUnique.mockResolvedValue(etapaData);
            const prismaError = new Prisma.PrismaClientKnownRequestError("Erro", {
                code: "P2003",
                clientVersion: "4.x",
            });
            prismaService.etapa.update.mockRejectedValue(prismaError);

            await expect(service.update(1, { nome: "teste" })).rejects.toThrow(NotFoundException);
            await expect(service.update(1, { nome: "teste" })).rejects.toThrow(
                "Relacionamento inválido",
            );
        });
    });

    describe("delete", () => {
        it("deve deletar a etapa com sucesso", async () => {
            prismaService.etapa.findUnique.mockResolvedValue(etapaData); // getById
            prismaService.etapa.delete.mockResolvedValue(etapaData);

            const resultado = await service.delete(1);

            expect(resultado).toEqual(etapaData);
            expect(prismaService.etapa.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("deve lançar NotFoundException se tentar deletar uma etapa inexistente", async () => {
            prismaService.etapa.findUnique.mockResolvedValue(null);

            await expect(service.delete(99)).rejects.toThrow(NotFoundException);
            expect(prismaService.etapa.delete).not.toHaveBeenCalled();
        });
    });
});
