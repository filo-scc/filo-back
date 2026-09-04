import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "./dto/create-user-dto";
import { UpdateUserDto } from "./dto/update-user-dto";
import { LoginDto } from "./dto/login-dto";

describe("AuthController", () => {
    let controller: AuthController;
    let authService: AuthService;

    const mockAuthService = {
        create: jest.fn(),
        getAllByFabricoId: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        login: jest.fn(),
        refresh: jest.fn(),
        logout: jest.fn(),
        getById: jest.fn(),
    };

    const mockUsuario = {
        id: 1,
        email: "teste@teste.com",
        nome: "Thiago",
        fabrico_id: 1,
    };

    const admin = {
        id: 99,
        email: "admin@filo.com",
        nome: "Admin",
        cargo: "ADMIN",
        foto_de_perfil: null,
        fabrico_id: null,
        fabrico: null,
    } as any;

    const proprietario = {
        id: 1,
        email: "proprietario@filo.com",
        nome: "Proprietário",
        cargo: "PROPRIETARIO",
        foto_de_perfil: null,
        fabrico_id: 1,
        fabrico: { id: 1, ativo: true },
    } as any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);
        jest.clearAllMocks();
    });

    it("deve estar definido", () => {
        expect(controller).toBeDefined();
    });

    describe("POST /usuarios", () => {
        it("deve repassar os dados para o authService.create e retornar o resultado", async () => {
            const dto: CreateUserDto = {
                email: "novo@teste.com",
                nome: "ThiagoNovo",
                senha: "123",
                cargo: "ADMIN" as any,
                fabrico_id: 1,
            };
            mockAuthService.create.mockResolvedValue({ message: "Usuário criado com sucesso!" });

            const resultado = await controller.create(dto);

            expect(authService.create).toHaveBeenCalledWith(dto);
            expect(resultado).toEqual({ message: "Usuário criado com sucesso!" });
        });
    });

    describe("GET /usuarios/fabrico", () => {
        it("deve repassar o usuário autenticado e o filtro administrativo", async () => {
            mockAuthService.getAllByFabricoId.mockResolvedValue([mockUsuario]);

            const resultado = await controller.getAllByFabricoId(admin, { fabrico_id: 1 });

            expect(authService.getAllByFabricoId).toHaveBeenCalledWith(admin, 1);
            expect(resultado).toEqual([mockUsuario]);
        });
    });

    describe("PUT /usuarios/:id", () => {
        it("deve repassar o ID do usuario e os dados para o authService.update", async () => {
            const dto: UpdateUserDto = { nome: "Thiago Editado" };
            mockAuthService.update.mockResolvedValue({ message: "Atualizado" });

            const resultado = await controller.update(1, dto, proprietario);

            expect(authService.update).toHaveBeenCalledWith(1, dto, proprietario);
            expect(resultado).toEqual({ message: "Atualizado" });
        });
    });

    describe("DELETE /usuarios/:id", () => {
        it("deve repassar o ID do usuario para o authService.delete", async () => {
            mockAuthService.delete.mockResolvedValue({ message: "Deletado" });

            const resultado = await controller.delete(1, proprietario);

            expect(authService.delete).toHaveBeenCalledWith(1, proprietario);
            expect(resultado).toEqual({ message: "Deletado" });
        });
    });

    describe("POST /usuarios/login", () => {
        it("deve repassar as credenciais para o authService.login", async () => {
            const dto: LoginDto = { email: "teste@teste.com", senha: "123" };
            const tokens = { accessToken: "token", refreshToken: "refresh" };
            mockAuthService.login.mockResolvedValue(tokens);

            const resultado = await controller.login(dto);

            expect(authService.login).toHaveBeenCalledWith(dto);
            expect(resultado).toEqual(tokens);
        });
    });

    describe("POST /usuarios/refresh", () => {
        it("deve repassar o ID do usuário da requisição para o authService.refresh", async () => {
            const novosTokens = { accessToken: "novo_token", refreshToken: "novo_refresh" };
            mockAuthService.refresh.mockResolvedValue(novosTokens);

            const resultado = await controller.refresh(proprietario);

            expect(authService.refresh).toHaveBeenCalledWith(1);
            expect(resultado).toEqual(novosTokens);
        });
    });

    describe("POST /usuarios/logout", () => {
        it("deve repassar o ID do usuário da requisição para o authService.logout", async () => {
            mockAuthService.logout.mockResolvedValue({ message: "Logout realizado." });

            const resultado = await controller.logout(proprietario);

            expect(authService.logout).toHaveBeenCalledWith(1);
            expect(resultado).toEqual({ message: "Logout realizado." });
        });
    });

    describe("GET /usuarios/:id", () => {
        it("deve chamar o authService.getById com o ID numérico correto", async () => {
            mockAuthService.getById.mockResolvedValue(mockUsuario);

            const resultado = await controller.getById(1, proprietario);

            expect(authService.getById).toHaveBeenCalledWith(1, proprietario);
            expect(resultado).toEqual(mockUsuario);
        });
    });
});
