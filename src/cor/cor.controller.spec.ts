import { Test, TestingModule } from "@nestjs/testing";
import { CorController } from "./cor.controller";
import { CorService } from "./cor.service";

describe("CorController", () => {
    let controller: CorController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CorController],
            providers: [CorService],
        }).compile();

        controller = module.get<CorController>(CorController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
