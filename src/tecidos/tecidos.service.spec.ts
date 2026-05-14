import { Test, TestingModule } from "@nestjs/testing";
import { TecidosService } from "./tecidos.service";
import { PrismaService } from "src/prisma/prisma.service";

describe("TecidosService", () => {
    let service: TecidosService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TecidosService,
                {
                    provide: PrismaService,
                    useValue: {},
                },
            ]
        }).compile();

        service = module.get<TecidosService>(TecidosService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
