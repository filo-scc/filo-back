import { Test, TestingModule } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ParceiroController } from "./parceiro.controller";
import { ParceiroService } from "./parceiro.service";

describe("ParceiroController", () => {
    let controller: ParceiroController;
    let parceiroService: {
        create: jest.Mock;
        getAllparceiroByFabrico: jest.Mock;
        getAll: jest.Mock;
        getById: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
        getParceirosByFabricoECategoria: jest.Mock;
    };

    const user: AuthenticatedUser = {
        id: 1,
        email: "gerente@filo.test",
        nome: "Gerente",
        foto_de_perfil: null,
        cargo: "GERENTE",
        fabrico_id: 7,
        fabrico: { id: 7, ativo: true },
    };

    beforeEach(async () => {
        parceiroService = {
            create: jest.fn(),
            getAllparceiroByFabrico: jest.fn(),
            getAll: jest.fn(),
            getById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            getParceirosByFabricoECategoria: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ParceiroController],
            providers: [
                {
                    provide: ParceiroService,
                    useValue: parceiroService,
                },
            ],
        }).compile();

        controller = module.get<ParceiroController>(ParceiroController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("repassa o usuario autenticado ao criar parceiro", () => {
        const dto = { nome: "Parceiro" };
        parceiroService.create.mockReturnValue({ message: "ok" });

        expect(controller.create(dto, user)).toEqual({ message: "ok" });
        expect(parceiroService.create).toHaveBeenCalledWith(dto, user);
    });

    it("lista parceiros usando o usuario autenticado", () => {
        parceiroService.getAll.mockReturnValue([]);

        expect(controller.findAll(user)).toEqual([]);
        expect(parceiroService.getAll).toHaveBeenCalledWith(user);
    });

    it("consulta por categoria usando o usuario autenticado", async () => {
        parceiroService.getParceirosByFabricoECategoria.mockResolvedValue([]);

        await expect(controller.getByCategoria(user, "Costura")).resolves.toEqual([]);
        expect(parceiroService.getParceirosByFabricoECategoria).toHaveBeenCalledWith(
            "Costura",
            user,
        );
    });

    it("consulta rota legada validando o fabrico da URL no service", async () => {
        parceiroService.getParceirosByFabricoECategoria.mockResolvedValue([]);

        await expect(controller.getByFabricoECategoria(7, "Costura", user)).resolves.toEqual([]);
        expect(parceiroService.getParceirosByFabricoECategoria).toHaveBeenCalledWith(
            "Costura",
            user,
            7,
        );
    });

    it("busca, atualiza e remove repassando o usuario autenticado", () => {
        parceiroService.getById.mockReturnValue({ id: 1 });
        parceiroService.update.mockReturnValue({ message: "updated" });
        parceiroService.delete.mockReturnValue({ message: "deleted" });

        expect(controller.findOne(user, 1)).toEqual({ id: 1 });
        expect(controller.update(user, 1, { nome: "Novo" })).toEqual({ message: "updated" });
        expect(controller.remove(user, 1)).toEqual({ message: "deleted" });

        expect(parceiroService.getById).toHaveBeenCalledWith(1, user);
        expect(parceiroService.update).toHaveBeenCalledWith(1, { nome: "Novo" }, user);
        expect(parceiroService.delete).toHaveBeenCalledWith(1, user);
    });
});
