import { Test, TestingModule } from "@nestjs/testing";
import { TamanhoService } from "./tamanho.service";
import { PrismaService } from "src/prisma/prisma.service";

describe("TamanhoService", () => {
    let service: TamanhoService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TamanhoService,
                {
                    provide: PrismaService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<TamanhoService>(TamanhoService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
