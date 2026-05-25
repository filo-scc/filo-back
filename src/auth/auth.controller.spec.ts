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

    describe("GET /usuarios/fabrico/:fabrico_id", () => {
        it("deve chamar authService.getAllByFabricoId com o ID do fabrico correto", async () => {
            mockAuthService.getAllByFabricoId.mockResolvedValue([mockUsuario]);

            const resultado = await controller.getAllByFabricoId(1);

            expect(authService.getAllByFabricoId).toHaveBeenCalledWith(1);
            expect(resultado).toEqual([mockUsuario]);
        });
    });

    describe("PUT /usuarios/:id", () => {
        it("deve repassar o ID do usuario e os dados para o authService.update", async () => {
            const dto: UpdateUserDto = { nome: "Thiago Editado" };
            mockAuthService.update.mockResolvedValue({ message: "Atualizado" });

            const resultado = await controller.update(1, dto);

            expect(authService.update).toHaveBeenCalledWith(1, dto);
            expect(resultado).toEqual({ message: "Atualizado" });
        });
    });

    describe("DELETE /usuarios/:id", () => {
        it("deve repassar o ID do usuario para o authService.delete", async () => {
            mockAuthService.delete.mockResolvedValue({ message: "Deletado" });

            const resultado = await controller.delete(1);

            expect(authService.delete).toHaveBeenCalledWith(1);
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
            const req = { user: { id: 1 } };
            const novosTokens = { accessToken: "novo_token", refreshToken: "novo_refresh" };
            mockAuthService.refresh.mockResolvedValue(novosTokens);

            const resultado = await controller.refresh(req);

            expect(authService.refresh).toHaveBeenCalledWith(1);
            expect(resultado).toEqual(novosTokens);
        });
    });

    describe("POST /usuarios/logout", () => {
        it("deve repassar o ID do usuário da requisição para o authService.logout", async () => {
            const req = { user: { id: 1 } };
            mockAuthService.logout.mockResolvedValue({ message: "Logout realizado." });

            const resultado = await controller.logout(req);

            expect(authService.logout).toHaveBeenCalledWith(1);
            expect(resultado).toEqual({ message: "Logout realizado." });
        });
    });

    describe("GET /usuarios/:id", () => {
        it("deve chamar o authService.getById com o ID numérico correto", async () => {
            mockAuthService.getById.mockResolvedValue(mockUsuario);

            const resultado = await controller.getById(1);

            expect(authService.getById).toHaveBeenCalledWith(1);
            expect(resultado).toEqual(mockUsuario);
        });
    });
});
