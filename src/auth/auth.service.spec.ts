import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { EnderecoService } from "../endereco/endereco.service";
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { Cargo, Prisma } from "@prisma/client";

// eslint-disable-next-line
const bcrypt = require("bcrypt");

describe("AuthService", () => {
    let service: AuthService;

    const mockPrismaService = {
        fabrico: {
            findFirst: jest.fn(),
        },
        usuario: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    };

    const mockJwtService = {
        sign: jest.fn(),
    };

    const mockEnderecoService = {
        create: jest.fn(),
        update: jest.fn(),
    };

    const mockUsuario = {
        id: 1,
        email: "teste@teste.com",
        nome: "Thiago",
        senha: "hashed_password",
        cargo: Cargo.ADMIN,
        fabrico_id: 1,
        refresh_token_hash: "hashed_refresh_token",
        fabrico: { id: 1, ativo: true },
        endereco: { id: 10, rua: "Rua T", cep: "50000000" },
    };

    const admin = {
        id: 99,
        email: "admin@filo.com",
        nome: "Admin",
        cargo: Cargo.ADMIN,
        foto_de_perfil: null,
        fabrico_id: null,
        fabrico: null,
    } as any;

    const proprietario = {
        id: 1,
        email: "proprietario@filo.com",
        nome: "Proprietário",
        cargo: Cargo.PROPRIETARIO,
        foto_de_perfil: null,
        fabrico_id: 1,
        fabrico: { id: 1, ativo: true },
    } as any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: EnderecoService, useValue: mockEnderecoService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);

        jest.clearAllMocks();
        mockPrismaService.fabrico.findFirst.mockResolvedValue({ id: 1 });

        jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed_password" as never);
        jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("deve estar definido", () => {
        expect(service).toBeDefined();
    });

    describe("Criando um usario", () => {
        const createDto: any = {
            email: "teste@teste.com",
            nome: "Novo Usuário",
            senha: "senha_forte",
            cargo: Cargo.GERENTE,
            fabrico_id: 1,
            endereco: { rua: "Rua H", cep: "50000000" },
        };

        it("Deve criar um usuáro, um endereço e encriptar a senha com sucesso", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(null);
            mockPrismaService.usuario.create.mockResolvedValue({ id: 2 });
            mockEnderecoService.create.mockResolvedValue({ id: 20 });
            mockPrismaService.usuario.update.mockResolvedValue({});

            const resultado = await service.create(createDto, admin);

            expect(resultado).toEqual({ message: "Usuário criado com sucesso!" });
            expect(bcrypt.hash).toHaveBeenCalledWith("senha_forte", 10);
            expect(mockPrismaService.usuario.create).toHaveBeenCalled();
            expect(mockEnderecoService.create).toHaveBeenCalledWith(createDto.endereco);
            expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
                where: { id: 2 },
                data: { endereco: { connect: { id: 20 } } },
            });
        });

        it("deve impedir a criação de um usuário e lançar ConflictException se já existir um usuário com o mesmo nome no fabrico", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(mockUsuario);

            await expect(service.create(createDto, admin)).rejects.toThrow(ConflictException);
            expect(mockPrismaService.usuario.create).not.toHaveBeenCalled();
        });

        it("deve ocorrer um ConflictException se o e-mail informado estiver em uso", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(null);

            const prismaError = new Prisma.PrismaClientKnownRequestError("Error", {
                code: "P2002",
                clientVersion: "1",
            });
            mockPrismaService.usuario.create.mockRejectedValue(prismaError);

            await expect(service.create(createDto, admin)).rejects.toThrow(ConflictException);
            await expect(service.create(createDto, admin)).rejects.toThrow(
                "Este e-mail já está em uso!",
            );
        });

        it("deve criar administrador diretamente sem vínculo com fábrico", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(null);
            mockPrismaService.usuario.create.mockResolvedValue({ id: 2 });
            mockEnderecoService.create.mockResolvedValue({ id: 20 });
            mockPrismaService.usuario.update.mockResolvedValue({});

            await expect(
                service.create(
                    {
                        email: "novo.admin@filo.com",
                        nome: "Novo Admin",
                        senha: "senha_forte",
                        cargo: Cargo.ADMIN,
                    },
                    admin,
                ),
            ).resolves.toEqual({ message: "Usuário criado com sucesso!" });

            expect(mockPrismaService.fabrico.findFirst).not.toHaveBeenCalled();
            expect(mockPrismaService.usuario.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    cargo: Cargo.ADMIN,
                    fabrico_id: null,
                }),
            });
        });

        it("deve impedir que proprietário crie administrador global", async () => {
            await expect(
                service.create(
                    {
                        email: "admin.indevido@filo.com",
                        nome: "Admin Indevido",
                        senha: "senha_forte",
                        cargo: Cargo.ADMIN,
                    },
                    proprietario,
                ),
            ).rejects.toBeInstanceOf(ForbiddenException);

            expect(mockPrismaService.usuario.create).not.toHaveBeenCalled();
        });

        it("deve ignorar o fabrico_id enviado por proprietário ao criar usuário de negócio", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(null);
            mockPrismaService.usuario.create.mockResolvedValue({ id: 2 });
            mockEnderecoService.create.mockResolvedValue({ id: 20 });
            mockPrismaService.usuario.update.mockResolvedValue({});

            await service.create({ ...createDto, fabrico_id: 999 }, proprietario);

            expect(mockPrismaService.fabrico.findFirst).toHaveBeenCalledWith({
                where: { id: proprietario.fabrico_id, ativo: true },
                select: { id: true },
            });
            expect(mockPrismaService.usuario.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ fabrico_id: proprietario.fabrico_id }),
            });
        });

        it("deve rejeitar a criação em fábrico inexistente ou inativo", async () => {
            mockPrismaService.fabrico.findFirst.mockResolvedValue(null);

            await expect(service.create(createDto, admin)).rejects.toBeInstanceOf(
                NotFoundException,
            );
            expect(mockPrismaService.usuario.create).not.toHaveBeenCalled();
        });
    });

    describe("Requisitando usuairo por ID / Reqisitando usuários pelo ID do fabrico", () => {
        it("deve retornar todos os usuários vinculados a um determinado fabrico_id", async () => {
            mockPrismaService.usuario.findMany.mockResolvedValue([mockUsuario]);

            const resultado = await service.getAllByFabricoId(proprietario);
            expect(resultado).toEqual([mockUsuario]);
            expect(mockPrismaService.usuario.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 1, cargo: { not: Cargo.ADMIN } },
                select: {
                    id: true,
                    email: true,
                    nome: true,
                    cargo: true,
                    fabrico_id: true,
                    foto_de_perfil: true,
                    endereco: true,
                },
            });
        });

        it("deve usar o fábrico solicitado pelo administrador", async () => {
            mockPrismaService.usuario.findMany.mockResolvedValue([mockUsuario]);

            await service.getAllByFabricoId(admin, 2);

            expect(mockPrismaService.usuario.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { fabrico_id: 2, cargo: { not: Cargo.ADMIN } },
                }),
            );
        });

        it("deve exigir o fabrico_id para a listagem administrativa", async () => {
            await expect(service.getAllByFabricoId(admin)).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });

        it("deve ignorar o fabrico_id informado por proprietário", async () => {
            mockPrismaService.usuario.findMany.mockResolvedValue([mockUsuario]);

            await service.getAllByFabricoId(proprietario, 99);

            expect(mockPrismaService.usuario.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { fabrico_id: 1, cargo: { not: Cargo.ADMIN } },
                }),
            );
        });

        it("deve retornar os dados do usuário caso o ID exista no banco", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(mockUsuario);

            const resultado = await service.getById(1, proprietario);
            expect(resultado).toEqual(mockUsuario);
            expect(mockPrismaService.usuario.findFirst).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: 1, cargo: { not: Cargo.ADMIN } },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    cargo: true,
                    fabrico_id: true,
                    foto_de_perfil: true,
                    endereco: true,
                },
            });
        });

        it("deve lançar NotFoundException se não encontrar nenhum usuário com o ID", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(null);

            await expect(service.getById(99, proprietario)).rejects.toThrow(NotFoundException);
        });

        it("deve retornar 404 para usuário de outro fábrico", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(null);

            await expect(service.getById(2, proprietario)).rejects.toBeInstanceOf(
                NotFoundException,
            );
            expect(mockPrismaService.usuario.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 2, fabrico_id: 1, cargo: { not: Cargo.ADMIN } },
                }),
            );
        });

        it("deve ocultar administrador com vínculo legado do proprietário", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(null);

            await expect(service.getById(99, proprietario)).rejects.toBeInstanceOf(
                NotFoundException,
            );
            expect(mockPrismaService.usuario.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 99, fabrico_id: 1, cargo: { not: Cargo.ADMIN } },
                }),
            );
        });

        it("deve permitir que admin consulte qualquer usuário", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(mockUsuario);

            await service.getById(2, admin);

            expect(mockPrismaService.usuario.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 2 } }),
            );
        });
    });

    describe("Atualizar usuário e endereço", () => {
        const updateDto: any = {
            nome: "Nome Atualizado",
            fabrico_id: 1,
            endereco: { rua: "Rua I" },
        };

        it("deve atualizar os dados do usuário e endereço com sucesso", async () => {
            mockPrismaService.usuario.findFirst
                .mockResolvedValueOnce(mockUsuario)
                .mockResolvedValueOnce(null);
            mockEnderecoService.update.mockResolvedValue({});
            mockPrismaService.usuario.update.mockResolvedValue({});

            const resultado = await service.update(1, updateDto, proprietario);

            expect(resultado).toEqual({ message: "Usuário atualizado com sucesso!" });
            expect(mockEnderecoService.update).toHaveBeenCalledWith(
                mockUsuario.endereco.id,
                updateDto.endereco,
            );
            expect(mockPrismaService.usuario.update).toHaveBeenCalled();
            expect(mockPrismaService.usuario.update.mock.calls[0][0].data).not.toHaveProperty(
                "fabrico_id",
            );
        });

        it("deve impedir que proprietário promova usuário para ADMIN", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue({
                ...mockUsuario,
                cargo: Cargo.GERENTE,
            });

            await expect(
                service.update(1, { cargo: Cargo.ADMIN }, proprietario),
            ).rejects.toBeInstanceOf(ForbiddenException);
            expect(mockPrismaService.usuario.update).not.toHaveBeenCalled();
        });

        it("deve retornar 404 ao tentar atualizar usuário de outro fábrico", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(null);

            await expect(
                service.update(2, { nome: "Outro tenant" }, proprietario),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(mockPrismaService.usuario.update).not.toHaveBeenCalled();
        });

        it("deve laçar um ConflictException ao tentar alterar o nome para um que já é usado por outro usuário no mesmo fabrico", async () => {
            mockPrismaService.usuario.findFirst
                .mockResolvedValueOnce(mockUsuario)
                .mockResolvedValueOnce({
                    id: 2,
                    nome: "Nome Atualizado",
                });

            await expect(service.update(1, updateDto, proprietario)).rejects.toThrow(
                ConflictException,
            );
            expect(mockPrismaService.usuario.update).not.toHaveBeenCalled();
        });

        it("deve lançar NotFoundException ao tentar atualizar o endereço de um usuário que não possui endereço cadastrado", async () => {
            mockPrismaService.usuario.findFirst
                .mockResolvedValueOnce({
                    ...mockUsuario,
                    endereco: null,
                })
                .mockResolvedValueOnce(null);

            await expect(service.update(1, updateDto, proprietario)).rejects.toThrow(
                NotFoundException,
            );
            expect(mockPrismaService.usuario.update).not.toHaveBeenCalled();
        });

        it("deve ocorrer um ConflictException se o e-mail novo informado já estiver cadastrado em outra conta", async () => {
            mockPrismaService.usuario.findFirst
                .mockResolvedValueOnce(mockUsuario)
                .mockResolvedValueOnce(null);

            const prismaError = new Prisma.PrismaClientKnownRequestError("Error", {
                code: "P2002",
                clientVersion: "1",
            });
            mockPrismaService.usuario.update.mockRejectedValue(prismaError);

            await expect(service.update(1, updateDto, proprietario)).rejects.toThrow(
                new ConflictException("Email já cadastrado"),
            );
        });
    });

    describe("Deletar um usario", () => {
        it("deve deletar um usuário com sucesso quando o ID for válido", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(mockUsuario);
            mockPrismaService.usuario.delete.mockResolvedValue(mockUsuario);

            const resultado = await service.delete(1, proprietario);

            expect(resultado).toEqual({ message: "Usuário deletado com sucesso!" });
            expect(mockPrismaService.usuario.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("deve lançar NotFoundException ao tentar excluir um usuário que não existe", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(null);

            await expect(service.delete(99, proprietario)).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.usuario.delete).not.toHaveBeenCalled();
        });

        it("deve retornar 404 ao tentar excluir usuário de outro fábrico", async () => {
            mockPrismaService.usuario.findFirst.mockResolvedValue(null);

            await expect(service.delete(2, proprietario)).rejects.toBeInstanceOf(NotFoundException);
            expect(mockPrismaService.usuario.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 2, fabrico_id: 1, cargo: { not: Cargo.ADMIN } },
                }),
            );
            expect(mockPrismaService.usuario.delete).not.toHaveBeenCalled();
        });
    });

    describe("Métodos de Autenticação para validar usuário, gerar token e login", () => {
        it("deve retornar os dados do usuário se as credenciais estiverem corretas", async () => {
            mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);

            const resultado = await service.validateUser("teste@teste.com", "senha123");
            expect(resultado).toEqual(mockUsuario);
        });

        it("deve lançar UnauthorizedException se o e-mail não for encontrado", async () => {
            mockPrismaService.usuario.findUnique.mockResolvedValue(null);

            await expect(service.validateUser("errado@teste.com", "senha123")).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it("deve lançar UnauthorizedException se a senha estiver incorreta", async () => {
            mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
            jest.spyOn(bcrypt, "compare").mockResolvedValue(false as never);

            await expect(service.validateUser("teste@teste.com", "senha_errada")).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it("deve rejeitar usuário de negócio sem fábrico", async () => {
            mockPrismaService.usuario.findUnique.mockResolvedValue({
                ...mockUsuario,
                cargo: Cargo.GERENTE,
                fabrico_id: null,
                fabrico: null,
            });

            await expect(service.validateUser("teste@teste.com", "senha123")).rejects.toThrow(
                new UnauthorizedException("Usuário sem fábrico ativo"),
            );
        });

        it("deve rejeitar usuário de negócio vinculado a fábrico inativo", async () => {
            mockPrismaService.usuario.findUnique.mockResolvedValue({
                ...mockUsuario,
                cargo: Cargo.PROPRIETARIO,
                fabrico: { id: 1, ativo: false },
            });

            await expect(service.validateUser("teste@teste.com", "senha123")).rejects.toThrow(
                new UnauthorizedException("Usuário sem fábrico ativo"),
            );
        });

        it("deve permitir administrador global sem fábrico", async () => {
            mockPrismaService.usuario.findUnique.mockResolvedValue({
                ...mockUsuario,
                cargo: Cargo.ADMIN,
                fabrico_id: null,
                fabrico: null,
            });

            await expect(
                service.validateUser("teste@teste.com", "senha123"),
            ).resolves.toMatchObject({
                cargo: Cargo.ADMIN,
                fabrico_id: null,
                fabrico: null,
            });
        });

        it("deve gerar novos tokens e salvar o hash do refreshToken no banco", async () => {
            mockJwtService.sign
                .mockReturnValueOnce("fake_access_token")
                .mockReturnValueOnce("fake_refresh_token");
            mockPrismaService.usuario.update.mockResolvedValue({});

            const resultado = await service.generateTokens(mockUsuario);

            expect(resultado.accessToken).toBe("fake_access_token");
            expect(resultado.refreshToken).toBe("fake_refresh_token");
            expect(resultado.user.email).toBe(mockUsuario.email);
            expect(resultado.user.fabrico_id).toBeNull();
            expect(mockJwtService.sign).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({ cargo: Cargo.ADMIN, fabrico_id: null }),
                expect.any(Object),
            );
            expect(mockJwtService.sign).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({ cargo: Cargo.ADMIN, fabrico_id: null }),
                expect.any(Object),
            );
            expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
                where: { id: mockUsuario.id },
                data: { refresh_token_hash: "hashed_password" },
            });
        });

        it("deve manter o fábrico atual no payload de usuários de negócio", async () => {
            mockJwtService.sign
                .mockReturnValueOnce("fake_access_token")
                .mockReturnValueOnce("fake_refresh_token");
            mockPrismaService.usuario.update.mockResolvedValue({});

            const resultado = await service.generateTokens({
                ...mockUsuario,
                cargo: Cargo.GERENTE,
            });

            expect(resultado.user).toMatchObject({
                cargo: Cargo.GERENTE,
                fabrico_id: 1,
            });
        });

        it("deve validar as credenciais e retornar o accessToken e refreshToken", async () => {
            mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
            mockJwtService.sign.mockReturnValue("fake_token");

            const loginDto = { email: "teste@teste.com", senha: "123" };
            const resultado = await service.login(loginDto);

            expect(resultado).toHaveProperty("accessToken");
            expect(resultado).toHaveProperty("refreshToken");
        });
    });

    describe("Métodos de Sessão para refresh e logout", () => {
        it("deve gerar novos tokens de acesso caso o usuário exista no banco", async () => {
            mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
            mockJwtService.sign.mockReturnValue("new_fake_token");

            const resultado = await service.refresh(1);

            expect(resultado).toHaveProperty("accessToken");
            expect(resultado).toHaveProperty("refreshToken");
        });

        it("deve lançar UnauthorizedException se o ID do usuário não for encontrado", async () => {
            mockPrismaService.usuario.findUnique.mockResolvedValue(null);

            await expect(service.refresh(99)).rejects.toThrow(UnauthorizedException);
        });

        it("deve alterar o refresh_token_hash do usuário para null no banco de dados", async () => {
            mockPrismaService.usuario.update.mockResolvedValue({});

            const resultado = await service.logout(1);

            expect(resultado).toEqual({ message: "Logout realizado." });
            expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { refresh_token_hash: null },
            });
        });
    });
});
