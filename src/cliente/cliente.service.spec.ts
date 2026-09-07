import { Test, TestingModule } from "@nestjs/testing";
import { ClienteService } from "./cliente.service";
import { PrismaService } from "../prisma/prisma.service";
import { EnderecoService } from "../endereco/endereco.service";
import { ConflictException } from "@nestjs/common/exceptions/conflict.exception";
import { Prisma } from "@prisma/client";
import { BadRequestException } from "@nestjs/common/exceptions/bad-request.exception";
import { NotFoundException } from "@nestjs/common/exceptions/not-found.exception";

const { PrismaClientKnownRequestError, PrismaClientValidationError } = Prisma;

const FABRICO_ID = 1;

const mockPrismaService = {
    cliente: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },
};

const mockEnderecoService = {
    create: jest.fn(),
    update: jest.fn(),
};

describe("ClienteService", () => {
    let service: ClienteService;
    let prisma: typeof mockPrismaService;
    let clienteData: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClienteService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: EnderecoService, useValue: mockEnderecoService },
            ],
        }).compile();

        service = module.get<ClienteService>(ClienteService);
        prisma = module.get(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    beforeAll(() => {
        clienteData = {
            nome: "Empresa Teste Ltda",
            cnpj: "12345678000199",
            telefone: "11999999999",
            responsavel: "João da Silva",
            status: true,
            endereco: {
                rua: "Rua das Flores",
                numero: "123A",
                bairro: "Centro",
                cidade: "São Paulo",
                estado: "SP",
            },
        };
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
        expect(prisma).toBeDefined();
    });

    describe("create", () => {
        it("Criar um cliente com sucesso", async () => {
            prisma.cliente.findFirst.mockResolvedValue(null);

            const clienteSalvo = {
                id: 1,
                ...clienteData,
                fabrico_id: FABRICO_ID,
            };
            prisma.cliente.create.mockResolvedValue(clienteSalvo);

            mockEnderecoService.create.mockResolvedValue({ id: 99 });

            prisma.cliente.update.mockResolvedValue({ ...clienteSalvo, endereco_id: 99 });

            const resultado = await service.create(clienteData, FABRICO_ID);

            expect(resultado).toEqual({ message: "Cliente criado com sucesso" });

            expect(prisma.cliente.create).toHaveBeenCalledTimes(1);

            const { endereco: _endereco, ...dadosDoCliente } = clienteData;

            expect(prisma.cliente.create).toHaveBeenCalledWith({
                data: {
                    ...dadosDoCliente,
                    fabrico_id: FABRICO_ID,
                },
            });
        });

        it("Deve criar um cliente com sucesso sem endereço (usando fallback)", async () => {
            prisma.cliente.findFirst.mockResolvedValue(null);

            prisma.cliente.create.mockResolvedValue({ id: 10 });

            mockEnderecoService.create.mockResolvedValue({ id: 99 });

            prisma.cliente.update.mockResolvedValue({});

            const dadosEntrada = {
                nome: "Empresa Sem Endereco",
                telefone: "1199999999",
                status: true,
            };

            const resultado = await service.create(
                { ...dadosEntrada, endereco: undefined } as any,
                FABRICO_ID,
            );

            expect(resultado).toEqual({ message: "Cliente criado com sucesso" });

            expect(prisma.cliente.create).toHaveBeenCalledWith({
                data: {
                    ...dadosEntrada,
                    fabrico_id: FABRICO_ID,
                },
            });

            expect(mockEnderecoService.create).toHaveBeenCalledWith({});

            expect(prisma.cliente.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data: { endereco: { connect: { id: 99 } } },
            });
        });

        it("Criar um cliente com Nome existente deve lançar ConflictException", async () => {
            prisma.cliente.findFirst.mockResolvedValue({ id: 2, ...clienteData });

            await expect(service.create(clienteData, FABRICO_ID)).rejects.toThrow(
                new ConflictException("Já existe um cliente com esse nome neste fabrico"),
            );

            expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
                where: { nome: clienteData.nome, fabrico_id: FABRICO_ID },
            });
        });

        it("Criar um cliente com CNPJ existente deve lançar ConflictException", async () => {
            prisma.cliente.findFirst.mockResolvedValue(null);

            const prismaError = new PrismaClientKnownRequestError("Erro simulado", {
                code: "P2002",
                clientVersion: "5.0.0",
                meta: { target: "cnpj" },
            });

            prisma.cliente.create.mockRejectedValue(prismaError);

            await expect(service.create(clienteData, FABRICO_ID)).rejects.toThrow(
                new ConflictException("CNPJ já cadastrado"),
            );

            const { endereco: _endereco, ...dadosDoCliente } = clienteData;

            expect(prisma.cliente.create).toHaveBeenCalledWith({
                data: {
                    ...dadosDoCliente,
                    fabrico_id: FABRICO_ID,
                },
            });
        });

        it("Deve lançar BadRequestException se o Prisma apontar falha de validação nos dados", async () => {
            prisma.cliente.findFirst.mockResolvedValue(null);

            const erroValidacao = new PrismaClientValidationError("Tipos incompativeis", {
                clientVersion: "5.0.0",
            });

            prisma.cliente.create.mockRejectedValue(erroValidacao);

            await expect(service.create(clienteData, FABRICO_ID)).rejects.toThrow(
                new BadRequestException("Dados inválidos"),
            );
        });
    });

    describe("remove", () => {
        it("Deletar um cliente com sucesso", async () => {
            const clienteSalvo = {
                id: 1,
                ...clienteData,
                fabrico_id: FABRICO_ID,
            };

            prisma.cliente.findFirst.mockResolvedValue(clienteSalvo);

            prisma.cliente.delete.mockResolvedValue(clienteSalvo);

            const resultado = await service.remove(1, FABRICO_ID);

            expect(resultado).toEqual(clienteSalvo);

            expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: FABRICO_ID },
                include: { endereco: true },
            });

            expect(prisma.cliente.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it("Deve lançar NotFoundException ao tentar deletar um cliente inexistente", async () => {
            prisma.cliente.findFirst.mockResolvedValue(null);

            await expect(service.remove(999, FABRICO_ID)).rejects.toThrow(
                new NotFoundException("Cliente não encontrado"),
            );

            expect(prisma.cliente.delete).not.toHaveBeenCalled();
        });

        it("Deve lançar ConflictException se o cliente tiver dependências que impedem a deleção", async () => {
            prisma.cliente.findFirst.mockResolvedValue({ id: 1 });

            const erroPrisma = new PrismaClientKnownRequestError("Erro de dependência", {
                code: "P2003",
                clientVersion: "5.0.0",
            });
            prisma.cliente.delete.mockRejectedValue(erroPrisma);

            await expect(service.remove(1, FABRICO_ID)).rejects.toThrow(ConflictException);
        });
    });

    describe("findOne", () => {
        it("Encontrar um cliente por ID com sucesso", async () => {
            const clienteSalvo = {
                id: 1,
                ...clienteData,
                fabrico_id: FABRICO_ID,
            };

            prisma.cliente.findFirst.mockResolvedValue(clienteSalvo);

            const resultado = await service.findOne(1, FABRICO_ID);

            expect(resultado).toEqual(clienteSalvo);

            expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: FABRICO_ID },
                include: { endereco: true },
            });
        });

        it("Tentar encontrar um cliente inexistente deve lançar NotFoundException", async () => {
            prisma.cliente.findFirst.mockResolvedValue(null);

            await expect(service.findOne(999, FABRICO_ID)).rejects.toThrow(
                new NotFoundException("Cliente não encontrado"),
            );
            expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
                where: { id: 999, fabrico_id: FABRICO_ID },
                include: { endereco: true },
            });
        });

        it("Deve lançar BadRequestException se o ID for inválido para o Prisma", async () => {
            const erroValidacao = new PrismaClientValidationError("Tipos incompativeis", {
                clientVersion: "5.0.0",
            });
            prisma.cliente.findFirst.mockRejectedValue(erroValidacao);

            await expect(service.findOne("id_invalido" as any, FABRICO_ID)).rejects.toThrow(
                new BadRequestException("Parâmetros de consulta inválidos"),
            );
        });
    });

    describe("findAllByFabricoID", () => {
        it("Encontrar clientes por fabrico_id com sucesso", async () => {
            const clienteSalvo = {
                id: 1,
                ...clienteData,
                fabrico_id: FABRICO_ID,
            };

            prisma.cliente.findMany.mockResolvedValue([clienteSalvo]);

            const resultado = await service.findAllByFabricoID(FABRICO_ID);

            expect(resultado).toEqual([clienteSalvo]);

            expect(prisma.cliente.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: FABRICO_ID },
                include: { endereco: true },
            });
        });

        it("Deve retornar um array vazio se o fabrico não tiver clientes cadastrados", async () => {
            prisma.cliente.findMany.mockResolvedValue([]);

            const resultado = await service.findAllByFabricoID(2);

            expect(resultado).toEqual([]);
            expect(prisma.cliente.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 2 },
                include: { endereco: true },
            });
        });

        it("Deve lançar BadRequestException se o ID do fabrico for inválido (Erro do Prisma)", async () => {
            const erroValidacao = new PrismaClientValidationError(
                "Parâmetros de consulta inválidos",
                {
                    clientVersion: "5.0.0",
                },
            );

            prisma.cliente.findMany.mockRejectedValue(erroValidacao);

            await expect(service.findAllByFabricoID("invalido" as any)).rejects.toThrow(
                new BadRequestException("Parâmetros de consulta inválidos"),
            );
        });
    });

    describe("update", () => {
        it("Atualizar um cliente com sucesso", async () => {
            const clienteSalvo = {
                id: 1,
                ...clienteData,
                fabrico_id: FABRICO_ID,
            };

            const updateData = {
                nome: "Empresa Teste Atualizada Ltda",
                telefone: "11888888888",
            };

            prisma.cliente.findFirst
                .mockResolvedValueOnce(clienteSalvo)
                .mockResolvedValueOnce(null);

            prisma.cliente.update.mockResolvedValue({ ...clienteSalvo, ...updateData });

            const resultado = await service.update(1, updateData, FABRICO_ID);

            expect(resultado).toEqual({ message: "Cliente atualizado com sucesso" });

            expect(prisma.cliente.findFirst).toHaveBeenNthCalledWith(1, {
                where: { id: 1, fabrico_id: FABRICO_ID },
                include: { endereco: true },
            });

            expect(prisma.cliente.findFirst).toHaveBeenNthCalledWith(2, {
                where: {
                    nome: updateData.nome,
                    fabrico_id: FABRICO_ID,
                    NOT: { id: 1 },
                },
            });

            expect(prisma.cliente.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: updateData,
            });
        });

        it("Deve lançar ConflictException se o novo nome já estiver em uso por outro cliente no mesmo fabrico", async () => {
            const updateData = { nome: "Nome Duplicado" };

            prisma.cliente.findFirst
                .mockResolvedValueOnce({ id: 1, fabrico_id: FABRICO_ID, endereco: null })
                .mockResolvedValueOnce({ id: 99, nome: "Nome Duplicado" });

            await expect(service.update(1, updateData as any, FABRICO_ID)).rejects.toThrow(
                new ConflictException("Nome ja existente"),
            );

            expect(prisma.cliente.update).not.toHaveBeenCalled();
        });

        it("Deve lançar NotFoundException ao tentar atualizar um cliente que não existe", async () => {
            prisma.cliente.findFirst.mockResolvedValueOnce(null);

            await expect(service.update(999, { nome: "Teste" } as any, FABRICO_ID)).rejects.toThrow(
                new NotFoundException("Cliente não encontrado"),
            );
        });

        it("Deve lançar BadRequestException quando o Prisma reportar erro de validação", async () => {
            jest.spyOn(service, "findOne").mockResolvedValueOnce({ id: 1, endereco: {} } as any);

            const erroValidacao = new PrismaClientValidationError("Erro interno do Prisma", {
                clientVersion: "5.0.0",
            });

            prisma.cliente.update.mockRejectedValue(erroValidacao);
            await expect(
                service.update(1, { telefone: "1199999999" } as any, FABRICO_ID),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
