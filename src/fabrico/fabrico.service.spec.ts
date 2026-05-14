import { Test, TestingModule } from "@nestjs/testing";
import { FabricoService } from "./fabrico.service";
import { PrismaService } from "src/prisma/prisma.service";

describe("FabricoService", () => {
    let service: FabricoService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FabricoService,

                {
                    provide: PrismaService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<FabricoService>(FabricoService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
