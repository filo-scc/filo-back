import { Test, TestingModule } from "@nestjs/testing";
import { EtapaController } from "./etapa.controller";
import { EtapaService } from "./etapa.service";

describe("EtapaController", () => {
    let controller: EtapaController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EtapaController],
            providers: [
                {
                    provide: EtapaService,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<EtapaController>(EtapaController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
