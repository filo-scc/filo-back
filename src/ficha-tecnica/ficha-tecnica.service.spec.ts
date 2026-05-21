import { Test, TestingModule } from "@nestjs/testing";
import { FichaTecnicaService } from "./ficha-tecnica.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ProdutoService } from "src/produto/produto.service";
import { FabricoService } from "src/fabrico/fabrico.service";
import { EtapaService } from "src/etapa/etapa.service";

describe("FichaTecnicaService", () => {
    let service: FichaTecnicaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FichaTecnicaService,
                {
                    provide: PrismaService,
                    useValue: {},
                },
                {
                    provide: ProdutoService,
                    useValue: {},
                },

                {
                    provide: FabricoService,
                    useValue: {},
                },

                {
                    provide: EtapaService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<FichaTecnicaService>(FichaTecnicaService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
