import { Test, TestingModule } from "@nestjs/testing";
import { FabricoGradeService } from "./fabrico-grade.service";

describe("FabricoGradeService", () => {
    let service: FabricoGradeService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FabricoGradeService],
        }).compile();

        service = module.get<FabricoGradeService>(FabricoGradeService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
