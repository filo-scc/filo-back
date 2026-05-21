import { Test, TestingModule } from "@nestjs/testing";
import { TecidosController } from "./tecidos.controller";
import { TecidosService } from "./tecidos.service";

describe("TecidosController", () => {
    let controller: TecidosController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TecidosController],
            providers: [
                {
                    provide: TecidosService,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<TecidosController>(TecidosController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
