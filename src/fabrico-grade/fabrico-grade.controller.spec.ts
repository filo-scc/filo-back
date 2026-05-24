import { Test, TestingModule } from "@nestjs/testing";
import { FabricoGradeController } from "./fabrico-grade.controller";
import { FabricoGradeService } from "./fabrico-grade.service";

describe("FabricoGradeController", () => {
    let controller: FabricoGradeController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [FabricoGradeController],
            providers: [
                {
                    provide: FabricoGradeService,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<FabricoGradeController>(FabricoGradeController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
