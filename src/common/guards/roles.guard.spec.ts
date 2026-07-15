import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
    let reflector: { getAllAndOverride: jest.Mock };
    let guard: RolesGuard;
    let context: any;

    beforeEach(() => {
        reflector = { getAllAndOverride: jest.fn() };
        guard = new RolesGuard(reflector as unknown as Reflector);
        context = {
            getHandler: jest.fn().mockReturnValue("handler"),
            getClass: jest.fn().mockReturnValue("class"),
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({ user: { cargo: "admin" } }),
            }),
        };
    });

    it("permite acesso quando a rota não exige roles", () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);

        expect(guard.canActivate(context)).toBe(true);
        expect(context.switchToHttp).not.toHaveBeenCalled();
    });

    it("permite usuário com cargo autorizado", () => {
        reflector.getAllAndOverride.mockReturnValue(["admin"]);

        expect(guard.canActivate(context)).toBe(true);
    });

    it("bloqueia usuário sem cargo autorizado", () => {
        reflector.getAllAndOverride.mockReturnValue(["gestor"]);

        expect(guard.canActivate(context)).toBe(false);
    });
});
