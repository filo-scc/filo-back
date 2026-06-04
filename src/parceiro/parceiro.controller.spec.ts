import { Test, TestingModule } from "@nestjs/testing";
import { ParceiroController } from "./parceiro.controller";
import { ParceiroService } from "./parceiro.service";

describe("ParceiroController", () => {
    let controller: ParceiroController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ParceiroController],
            providers: [
                {
                    provide: ParceiroService,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<ParceiroController>(ParceiroController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
