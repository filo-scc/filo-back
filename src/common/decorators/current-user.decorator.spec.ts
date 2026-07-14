import { ExecutionContext } from "@nestjs/common";
import { getCurrentUser } from "./current-user.decorator";

describe("getCurrentUser", () => {
    it("retorna o usuario presente na request", () => {
        const usuario = { id: 1, nome: "Arthur" };
        const context = {
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({ usuario }),
            }),
        } as unknown as ExecutionContext;

        expect(getCurrentUser(undefined, context)).toBe(usuario);
    });
});
