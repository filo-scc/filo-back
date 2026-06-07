import { Test, TestingModule } from "@nestjs/testing";
import { AviamentoController } from "./aviamento.controller";
import { AviamentoService } from "./aviamento.service";

describe("AviamentoController", () => {
    let controller: AviamentoController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AviamentoController],
            providers: [
                {
                    provide: AviamentoService,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<AviamentoController>(AviamentoController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
