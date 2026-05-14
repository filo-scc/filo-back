import { Test, TestingModule } from "@nestjs/testing";
import { IconeController } from "./icone.controller";
import { IconeService } from "./icone.service";

describe("IconeController", () => {
    let controller: IconeController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [IconeController],
            providers: [
                {
                    provide: IconeService,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<IconeController>(IconeController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
