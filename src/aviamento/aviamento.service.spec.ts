import { Test, TestingModule } from "@nestjs/testing";
import { AviamentoService } from "./aviamento.service";

describe("AviamentoService", () => {
    let service: AviamentoService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AviamentoService],
        }).compile();

        service = module.get<AviamentoService>(AviamentoService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
