import { Test, TestingModule } from "@nestjs/testing";
import { CorService } from "./cor.service";
import { PrismaService } from "src/prisma/prisma.service";

describe("CorService", () => {
    let service: CorService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CorService,
                {
                    provide: PrismaService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<CorService>(CorService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
