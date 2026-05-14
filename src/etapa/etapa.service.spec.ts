import { Test, TestingModule } from "@nestjs/testing";
import { EtapaService } from "./etapa.service";
import { PrismaService } from "src/prisma/prisma.service";

describe("EtapaService", () => {
    let service: EtapaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [EtapaService,

                {
                    provide: PrismaService,
                    useValue: {},
                },
            ]
        }).compile();

        service = module.get<EtapaService>(EtapaService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
