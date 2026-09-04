import { Test, TestingModule } from "@nestjs/testing";
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

    const req = { user: { fabrico_id: 7 } };

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

    it("cria parceiro com fabrico autenticado, ignorando body", () => {
        const dto: any = { nome: "Parceiro", fabrico_id: 99 };
        parceiroService.create.mockReturnValue({ message: "ok" });

        expect(controller.create(req, dto)).toEqual({ message: "ok" });
        expect(parceiroService.create).toHaveBeenCalledWith(dto, 7);
    });

    it("lista parceiros usando o fabrico autenticado", () => {
        parceiroService.getAll.mockReturnValue([]);

        expect(controller.findAll(req)).toEqual([]);
        expect(parceiroService.getAll).toHaveBeenCalledWith(7);
    });

    it("consulta por categoria usando implicitamente o fabrico autenticado", async () => {
        parceiroService.getParceirosByFabricoECategoria.mockResolvedValue([]);

        await expect(controller.getByCategoria(req, "Costura")).resolves.toEqual([]);
        expect(parceiroService.getParceirosByFabricoECategoria).toHaveBeenCalledWith(7, "Costura");
    });

    it("consulta rota legada por categoria ignorando fabrico da URL", async () => {
        parceiroService.getParceirosByFabricoECategoria.mockResolvedValue([]);

        await expect(controller.getByFabricoECategoria(req, "Costura")).resolves.toEqual([]);
        expect(parceiroService.getParceirosByFabricoECategoria).toHaveBeenCalledWith(7, "Costura");
    });

    it("busca, atualiza e remove pelo tenant autenticado", () => {
        parceiroService.getById.mockReturnValue({ id: 1 });
        parceiroService.update.mockReturnValue({ message: "updated" });
        parceiroService.delete.mockReturnValue({ message: "deleted" });

        expect(controller.findOne(req, "1")).toEqual({ id: 1 });
        expect(controller.update(req, "1", { nome: "Novo" })).toEqual({ message: "updated" });
        expect(controller.remove(req, "1")).toEqual({ message: "deleted" });

        expect(parceiroService.getById).toHaveBeenCalledWith(1, 7);
        expect(parceiroService.update).toHaveBeenCalledWith(1, { nome: "Novo" }, 7);
        expect(parceiroService.delete).toHaveBeenCalledWith(1, 7);
    });
});
