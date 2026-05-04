import { Test, TestingModule } from "@nestjs/testing";
import { ClienteService } from "./cliente.service";
import { PrismaService } from "../prisma/prisma.service";
import { EnderecoService } from "../endereco/endereco.service";
import { ConflictException } from "@nestjs/common/exceptions/conflict.exception";
import {
    PrismaClientKnownRequestError,
    PrismaClientValidationError,
} from "@prisma/client-runtime-utils";
import { BadRequestException } from "@nestjs/common/exceptions/bad-request.exception";
import { NotFoundException } from "@nestjs/common/exceptions/not-found.exception";

const mockPrismaService = {
    cliente: {
        findAllByFabricoID: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
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
            fabrico_id: 1,
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
        // Happy paths
        it("Criar um cliente com sucesso", async () => {
            const clienteSalvo = {
                id: 1,
                ...clienteData,
            };
            prisma.cliente.create.mockResolvedValue(clienteSalvo);

            mockEnderecoService.create.mockResolvedValue({ id: 99 });

            prisma.cliente.update.mockResolvedValue({ ...clienteSalvo, endereco_id: 99 });

            const resultado = await service.create(clienteData);

            expect(resultado).toEqual({ message: "Cliente criado com sucesso" });

            expect(prisma.cliente.create).toHaveBeenCalledTimes(1);

            const { endereco, ...dadosDoCliente } = clienteData;

            expect(prisma.cliente.create).toHaveBeenCalledWith({
                data: dadosDoCliente,
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
                fabrico_id: 1,
            };

            const resultado = await service.create({ ...dadosEntrada, endereco: undefined } as any);

            expect(resultado).toEqual({ message: "Cliente criado com sucesso" });

            expect(prisma.cliente.create).toHaveBeenCalledWith({
                data: {
                    ...dadosEntrada,
                    fabrico_id: Number(dadosEntrada.fabrico_id),
                },
            });

            expect(mockEnderecoService.create).toHaveBeenCalledWith({});

            expect(prisma.cliente.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data: { endereco: { connect: { id: 99 } } },
            });
        });
        // Unhappy paths
        it("Criar um cliente com Nome existente deve lançar ConflictException", async () => {
            prisma.cliente.findFirst.mockResolvedValue({ id: 2, ...clienteData });

            await expect(service.create(clienteData)).rejects.toThrow(
                new ConflictException("Já existe um cliente com esse nome neste fabrico"),
            );

            expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
                where: { nome: clienteData.nome, fabrico_id: Number(clienteData.fabrico_id) },
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

            await expect(service.create(clienteData)).rejects.toThrow(
                new ConflictException("CNPJ já cadastrado"),
            );

            expect(prisma.cliente.create).toHaveBeenCalledWith({
                data: {
                    nome: clienteData.nome,
                    cnpj: clienteData.cnpj,
                    telefone: clienteData.telefone,
                    responsavel: clienteData.responsavel,
                    status: clienteData.status,
                    fabrico_id: Number(clienteData.fabrico_id),
                },
            });
        });
        it("Deve lançar BadRequestException se o Prisma apontar falha de validação nos dados", async () => {
            prisma.cliente.findFirst.mockResolvedValue(null);

            const erroValidacao = new PrismaClientValidationError("Tipos incompativeis", {
                clientVersion: "5.0.0",
            });

            prisma.cliente.create.mockRejectedValue(erroValidacao);

            await expect(service.create(clienteData)).rejects.toThrow(
                new BadRequestException("Dados inválidos"),
            );
        });
        /* TODO: Criar este teste quando a trava de segurança de fabrico for implementada no Service.
        it("Deve lançar ForbiddenException ao tentar criar cliente em um fabrico diferente", async () => { ... });
        */
    });
    describe("remove", () => {
        // happy path
        it("Deletar um cliente com sucesso", async () => {
            const clienteSalvo = {
                id: 1,
                ...clienteData,
            };

            prisma.cliente.findFirst.mockResolvedValue(clienteSalvo);

            prisma.cliente.delete.mockResolvedValue(clienteSalvo);

            const resultado = await service.remove(1);

            expect(resultado).toEqual(clienteSalvo);

            expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
                where: { id: 1 },
                include: { endereco: true },
            });

            expect(prisma.cliente.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        // unhappy path

        it("Deve lançar NotFoundException ao tentar deletar um cliente inexistente", async () => {
            prisma.cliente.findFirst.mockResolvedValue(null);

            await expect(service.remove(999)).rejects.toThrow(
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

            await expect(service.remove(1)).rejects.toThrow(ConflictException);
        });
    });
    describe("findOne", () => {
        // Happy path
        it("Encontrar um cliente por ID com sucesso", async () => {
            const clienteSalvo = {
                id: 1,
                ...clienteData,
            };

            prisma.cliente.findFirst.mockResolvedValue(clienteSalvo);

            const resultado = await service.findOne(1);

            expect(resultado).toEqual(clienteSalvo);

            expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
                where: { id: 1 },
                include: { endereco: true },
            });
        });
        // Unhappy path
        it("Tentar encontrar um cliente inexistente deve lançar NotFoundException", async () => {
            prisma.cliente.findFirst.mockResolvedValue(null);

            await expect(service.findOne(999)).rejects.toThrow(
                new NotFoundException("Cliente não encontrado"),
            );
            expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
                where: { id: 999 },
                include: { endereco: true },
            });
        });
        it("Deve lançar BadRequestException se o ID for inválido para o Prisma", async () => {
            const erroValidacao = new PrismaClientValidationError("Tipos incompativeis", {
                clientVersion: "5.0.0",
            });
            prisma.cliente.findFirst.mockRejectedValue(erroValidacao);

            await expect(service.findOne("id_invalido" as any)).rejects.toThrow(
                new BadRequestException("Parâmetros de consulta inválidos"),
            );
        });
    });
    describe("findAllByFabricoID", () => {
        it("Encontrar clientes por fabrico_id com sucesso", async () => {
            const clienteSalvo = {
                id: 1,
                ...clienteData,
            };

            prisma.cliente.findMany.mockResolvedValue([clienteSalvo]);

            const resultado = await service.findAllByFabricoID(1);

            expect(resultado).toEqual([clienteSalvo]);

            expect(prisma.cliente.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 1 },
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

        // Unhappy path
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
        // Happy path
        it("Atualizar um cliente com sucesso", async () => {
            const clienteSalvo = {
                id: 1,
                ...clienteData,
            };

            const updateData = {
                nome: "Empresa Teste Atualizada Ltda",
                telefone: "11888888888",
                fabrico_id: 1,
            };

            prisma.cliente.findFirst
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(clienteSalvo);

            prisma.cliente.update.mockResolvedValue({ ...clienteSalvo, ...updateData });

            const resultado = await service.update(1, updateData);

            expect(resultado).toEqual({ message: "Cliente atualizado com sucesso" });

            expect(prisma.cliente.findFirst).toHaveBeenNthCalledWith(1, {
                where: {
                    nome: updateData.nome,
                    fabrico_id: updateData.fabrico_id,
                    NOT: { id: 1 },
                },
            });

            expect(prisma.cliente.findFirst).toHaveBeenNthCalledWith(2, {
                where: { id: 1 },
                include: { endereco: true },
            });

            expect(prisma.cliente.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: updateData,
            });
        });
        // Unhappy path
        it("Deve lançar ConflictException se o novo nome já estiver em uso por outro cliente no mesmo fabrico", async () => {
            const updateData = { nome: "Nome Duplicado", fabrico_id: 1 };

            prisma.cliente.findFirst.mockResolvedValueOnce({ id: 99, nome: "Nome Duplicado" });

            await expect(service.update(1, updateData as any)).rejects.toThrow(
                new ConflictException("Nome ja existente"),
            );

            expect(prisma.cliente.update).not.toHaveBeenCalled();
        });
        it("Deve lançar NotFoundException ao tentar atualizar um cliente que não existe", async () => {
            prisma.cliente.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

            await expect(service.update(999, { nome: "Teste" } as any)).rejects.toThrow(
                new NotFoundException("Cliente não encontrado"),
            );
        });
        it("Deve lançar BadRequestException quando o Prisma reportar erro de validação", async () => {
            prisma.cliente.findFirst.mockResolvedValueOnce(null);

            jest.spyOn(service, "findOne").mockResolvedValueOnce({ id: 1, endereco: {} } as any);

            const erroValidacao = new PrismaClientValidationError("Erro interno do Prisma", {
                clientVersion: "5.0.0",
            });

            prisma.cliente.update.mockRejectedValue(erroValidacao);
            await expect(service.update(1, { nome: "Teste" } as any)).rejects.toThrow(
                BadRequestException,
            );
        });
    });
    describe("findAll", () => {
        //Happy path
        it("Encontrar todos os clientes com sucesso", async () => {
            const clienteSalvo = {
                id: 1,
                ...clienteData,
            };

            prisma.cliente.findMany.mockResolvedValue([clienteSalvo]);

            const resultado = await service.findAll();

            expect(resultado).toEqual([clienteSalvo]);

            expect(prisma.cliente.findMany).toHaveBeenCalledWith({
                include: { endereco: true },
            });
        });
        it("Deve retornar um array vazio se não houver clientes", async () => {
            prisma.cliente.findMany.mockResolvedValue([]);

            const resultado = await service.findAll();

            expect(resultado).toEqual([]);
            expect(prisma.cliente.findMany).toHaveBeenCalledTimes(1);
        });
    });
    //unhappy path
});
