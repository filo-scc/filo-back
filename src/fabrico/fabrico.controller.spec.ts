import { Test, TestingModule } from "@nestjs/testing";
import { FabricoController } from "./fabrico.controller";
import { FabricoService } from "./fabrico.service";

describe("FabricoController", () => {
    let controller: FabricoController;
    const getByIdForUser = jest.fn();
    const proprietario = {
        cargo: "PROPRIETARIO",
        fabrico_id: 1,
        fabrico: { id: 1, ativo: true },
    } as any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [FabricoController],
            providers: [
                {
                    provide: FabricoService,
                    useValue: { getByIdForUser },
                },
            ],
        }).compile();

        controller = module.get<FabricoController>(FabricoController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("repassa o contexto autenticado ao consultar detalhes", async () => {
        getByIdForUser.mockResolvedValue({ id: 1 });

        await controller.getById(1, proprietario);

        expect(getByIdForUser).toHaveBeenCalledWith(1, proprietario);
    });
});
