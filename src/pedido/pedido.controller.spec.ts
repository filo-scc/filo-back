import { Test, TestingModule } from "@nestjs/testing";
import { PedidoController } from "./pedido.controller";
import { PedidoService } from "./pedido.service";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

describe("PedidoController", () => {
    let controller: PedidoController;

    const usuario: AuthenticatedUser = {
        id: 1,
        email: "gerente@teste.com",
        nome: "Gerente",
        foto_de_perfil: null,
        cargo: "GERENTE",
        fabrico_id: 10,
        fabrico: { id: 10, ativo: true },
    };

    const mockPedidoService = {
        create: jest.fn(),
        createCompleto: jest.fn(),
        updateCompleto: jest.fn(),
        findAll: jest.fn(),
        getById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findAllCliente: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PedidoController],
            providers: [
                {
                    provide: PedidoService,
                    useValue: mockPedidoService,
                },
            ],
        }).compile();

        controller = module.get<PedidoController>(PedidoController);
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("deve criar pedido com fabrico do usuário autenticado", async () => {
        const dto = { finalizado: false, cor: "#FFFFFF", quantidade: 1 };
        mockPedidoService.create.mockResolvedValue({ id: 1 });

        await controller.create(dto as any, usuario);

        expect(mockPedidoService.create).toHaveBeenCalledWith(dto, usuario);
    });

    it("deve criar pedido completo com fabrico do usuário autenticado", async () => {
        const dto = { fichas: [{ produto_id: 1, quantidade: 5 }] };
        mockPedidoService.createCompleto.mockResolvedValue({ id: 1 });

        await controller.createCompleto(dto as any, usuario);

        expect(mockPedidoService.createCompleto).toHaveBeenCalledWith(dto, usuario, undefined);
    });

    it("deve criar pedido completo com chave de idempotência do header", async () => {
        const dto = { fichas: [{ produto_id: 1, quantidade: 5 }] };
        mockPedidoService.createCompleto.mockResolvedValue({ id: 1 });

        await controller.createCompleto(dto as any, usuario, "req-9");

        expect(mockPedidoService.createCompleto).toHaveBeenCalledWith(dto, usuario, "req-9");
    });

    it("deve editar pedido completo com fabrico do usuário autenticado", async () => {
        const dto = { cliente_id: 3, fichas: [{ id: 8, produto_id: 1, quantidade: 5 }] };
        mockPedidoService.updateCompleto.mockResolvedValue({ id: 4 });

        await controller.updateCompleto(4, dto as any, usuario);

        expect(mockPedidoService.updateCompleto).toHaveBeenCalledWith(4, dto, usuario);
    });

    it("deve listar apenas pedidos do fabrico do usuário", async () => {
        mockPedidoService.findAll.mockResolvedValue([]);

        await controller.findAll(usuario);

        expect(mockPedidoService.findAll).toHaveBeenCalledWith(usuario);
    });

    it("deve buscar pedido por id no fabrico do usuário", async () => {
        mockPedidoService.getById.mockResolvedValue({ id: 5 });

        await controller.getById(5, usuario);

        expect(mockPedidoService.getById).toHaveBeenCalledWith(5, usuario);
    });

    it("deve listar pedidos do cliente no fabrico do usuário", async () => {
        mockPedidoService.findAllCliente.mockResolvedValue([]);

        await controller.findAllCliente(7, usuario);

        expect(mockPedidoService.findAllCliente).toHaveBeenCalledWith(7, usuario);
    });
});
