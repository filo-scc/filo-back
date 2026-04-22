import { Test, TestingModule } from "@nestjs/testing";
import { EnderecoService } from "./endereco.service";

describe("EnderecoService", () => {
    let service: EnderecoService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [EnderecoService],
        }).compile();

        service = module.get<EnderecoService>(EnderecoService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
