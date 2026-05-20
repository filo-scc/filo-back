import { Test, TestingModule } from "@nestjs/testing";
import { FaccaoController } from "./faccao.controller";
import { FaccaoService } from "./faccao.service";

describe("FaccaoController", () => {
    let controller: FaccaoController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [FaccaoController],
            providers: [
                {
                    provide: FaccaoService,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<FaccaoController>(FaccaoController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
