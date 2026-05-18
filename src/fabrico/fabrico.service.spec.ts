import { Test, TestingModule } from "@nestjs/testing";
import { FabricoService } from "./fabrico.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

const mockPrismaService = {
    fabrico: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },
};

describe("FabricoService", () => {
    let service: FabricoService;
    let prismaService: typeof mockPrismaService;
    let fabricoData: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FabricoService, { provide: PrismaService, useValue: mockPrismaService }],
        }).compile();

        service = module.get<FabricoService>(FabricoService);
        prismaService = module.get(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    beforeAll(() => {
        fabricoData = {
            id: 1,
            foto_de_perfil: null,
            cnpj: "00394460005887",
            razao_social: "fabio inc",
            nome_fantasia: "tonho inc",
            ativo: true,
        };
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
        expect(prismaService).toBeDefined();
    });

    describe("create", () => {
        it("deve criar um fabrico com sucesso quando receber dados válidos", async () => {
            prismaService.fabrico.create.mockResolvedValue(fabricoData);


            const { ...createDto } = fabricoData;
            const resultado = await service.create(createDto);

            expect(resultado).toEqual(fabricoData);
            expect(prismaService.fabrico.create).toHaveBeenCalledTimes(1);
            expect(prismaService.fabrico.create).toHaveBeenCalledWith({
                data: createDto,
            });
        });

        it("deve criar um fabrico com sucesso apenas com os dados mínimos (vazios)", async () => {
            const fabricoVazio = { id: 2 };
            prismaService.fabrico.create.mockResolvedValue(fabricoVazio);

            const resultado = await service.create({}); 

            expect(resultado).toEqual(fabricoVazio);
            expect(prismaService.fabrico.create).toHaveBeenCalledWith({
                data: {},
            });
        });

        it("deve lançar ConflictException quando o CNPJ já estiver cadastrado (Erro P2002)", async () => {
            const prismaError = new Prisma.PrismaClientKnownRequestError(
                "Unique constraint failed",
                { code: "P2002", clientVersion: "4.x" },
            );
            prismaService.fabrico.create.mockRejectedValue(prismaError);

            expect(prismaService.fabrico.create).toHaveBeenCalledTimes(0);

            await expect(service.create(fabricoData)).rejects.toThrow(ConflictException);

        
            
            await expect(service.create(fabricoData)).rejects.toThrow("CNPJ já cadastrado");
        });

        it("deve repassar o erro genérico se o Prisma falhar por outro motivo", async () => {
            const erroGenerico = new Error("Erro de banco de dados");
            prismaService.fabrico.create.mockRejectedValue(erroGenerico);

            await expect(service.create(fabricoData)).rejects.toThrow(erroGenerico);
        });
    });


    describe("getAll", () => {
        it("deve retornar uma lista de fabricos", async () => {
            const lista = [fabricoData];
            prismaService.fabrico.findMany.mockResolvedValue(lista);

            const resultado = await service.getAll();

            expect(resultado).toEqual(lista);
            expect(prismaService.fabrico.findMany).toHaveBeenCalledTimes(1);
        });
    });

    describe("getById", () => {
        it("deve retornar um fabrico quando o ID existir", async () => {
            prismaService.fabrico.findUnique.mockResolvedValue(fabricoData);

            const resultado = await service.getById(1);

            expect(resultado).toEqual(fabricoData);
            expect(prismaService.fabrico.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it("deve lançar NotFoundException quando o ID não existir", async () => {
            prismaService.fabrico.findUnique.mockResolvedValue(null);

            await expect(service.getById(99)).rejects.toThrow(NotFoundException);
            await expect(service.getById(99)).rejects.toThrow("Fabrico não encontrado");
        });
    });

   
    describe("update", () => {
        it("deve atualizar os dados do fabrico com sucesso", async () => {
            
            prismaService.fabrico.findUnique.mockResolvedValue(fabricoData);

           
            const dadosAtualizados = { ...fabricoData, nome_fantasia: "Novo Nome" };
            prismaService.fabrico.update.mockResolvedValue(dadosAtualizados);

            const resultado = await service.update(1, { nome_fantasia: "Novo Nome" });

            expect(resultado).toEqual(dadosAtualizados);
            expect(prismaService.fabrico.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { nome_fantasia: "Novo Nome" },
            });
        });

        it("deve lançar NotFoundException ao tentar atualizar um ID inexistente", async () => {
            prismaService.fabrico.findUnique.mockResolvedValue(null);

            await expect(service.update(99, fabricoData)).rejects.toThrow(NotFoundException);
            expect(prismaService.fabrico.update).not.toHaveBeenCalled(); 
        });

        it("deve lançar ConflictException se a atualização violar um CNPJ já existente (Erro P2002)", async () => {
            prismaService.fabrico.findUnique.mockResolvedValue(fabricoData); 

            const prismaError = new Prisma.PrismaClientKnownRequestError(
                "Unique constraint failed",
                { code: "P2002", clientVersion: "4.x" },
            );
            prismaService.fabrico.update.mockRejectedValue(prismaError); 

            await expect(service.update(1, fabricoData)).rejects.toThrow(ConflictException);
        });
    });

    describe("delete", () => {
        it("deve deletar o fabrico com sucesso", async () => {
            prismaService.fabrico.findUnique.mockResolvedValue(fabricoData); // Passa na verificação do ID
            prismaService.fabrico.delete.mockResolvedValue(fabricoData);

            const resultado = await service.delete(1);

            expect(resultado).toEqual(fabricoData);
            expect(prismaService.fabrico.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it("deve lançar NotFoundException ao tentar deletar um ID inexistente", async () => {
            prismaService.fabrico.findUnique.mockResolvedValue(null);

            await expect(service.delete(99)).rejects.toThrow(NotFoundException);
            expect(prismaService.fabrico.delete).not.toHaveBeenCalled(); // Garante que não tentou deletar no banco
        });
    });
});
