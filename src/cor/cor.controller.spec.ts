import { Test, TestingModule } from "@nestjs/testing";
import { CorController } from "./cor.controller";
import { CorService } from "./cor.service";
import { ROLES_KEY } from "../common/decorators/roles.decorator";

describe("CorController", () => {
    let controller: CorController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CorController],
            providers: [
                {
                    provide: CorService,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<CorController>(CorController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("restringe cores a papéis de fábrica, sem ADMIN", () => {
        expect(Reflect.getMetadata(ROLES_KEY, CorController)).toEqual(["PROPRIETARIO", "GERENTE"]);

        const handlers = Object.getOwnPropertyNames(CorController.prototype).filter(
            (nome) => nome !== "constructor",
        );
        for (const handler of handlers) {
            const rolesDoHandler = Reflect.getMetadata(
                ROLES_KEY,
                (CorController.prototype as any)[handler],
            );
            expect(rolesDoHandler ?? []).not.toContain("ADMIN");
        }
    });
});
