import { Test, TestingModule } from "@nestjs/testing";
import { ProdutoAviamentoController } from "./produto-aviamento.controller";
import { ProdutoAviamentoService } from "./produto-aviamento.service";

describe("ProdutoAviamentoController", () => {
    let controller: ProdutoAviamentoController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProdutoAviamentoController],
            providers: [
                {
                    provide: ProdutoAviamentoService,
                    useValue: {}, // Mock simples apenas para inicializar o controller
                },
            ],
        }).compile();

        controller = module.get<ProdutoAviamentoController>(ProdutoAviamentoController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
