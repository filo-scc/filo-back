import { Test, TestingModule } from "@nestjs/testing";
import { FaccaoService } from "./faccao.service";

describe("FaccaoService", () => {
    let service: FaccaoService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FaccaoService],
        }).compile();

        service = module.get<FaccaoService>(FaccaoService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
