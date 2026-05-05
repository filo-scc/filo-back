import { Test, TestingModule } from "@nestjs/testing";
import { TamanhoController } from "./tamanho.controller";
import { TamanhoService } from "./tamanho.service";

describe("TamanhoController", () => {
    let controller: TamanhoController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TamanhoController],
            providers: [TamanhoService],
        }).compile();

        controller = module.get<TamanhoController>(TamanhoController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
