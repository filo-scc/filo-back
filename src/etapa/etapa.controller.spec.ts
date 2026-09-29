import { Test, TestingModule } from "@nestjs/testing";
import { EtapaController } from "./etapa.controller";
import { EtapaService } from "./etapa.service";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

describe("EtapaController", () => {
    let controller: EtapaController;
    const findAllForAuthenticatedUser = jest.fn();
    const usuarioFabricoA: AuthenticatedUser = {
        id: 1,
        email: "gerente-a@filo.test",
        nome: "Gerente A",
        foto_de_perfil: null,
        cargo: "GERENTE",
        fabrico_id: 1,
        fabrico: { id: 1, ativo: true },
    };
    const usuarioFabricoB: AuthenticatedUser = {
        id: 2,
        email: "gerente-b@filo.test",
        nome: "Gerente B",
        foto_de_perfil: null,
        cargo: "GERENTE",
        fabrico_id: 2,
        fabrico: { id: 2, ativo: true },
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [EtapaController],
            providers: [
                {
                    provide: EtapaService,
                    useValue: { findAllForAuthenticatedUser },
                },
            ],
        }).compile();

        controller = module.get<EtapaController>(EtapaController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("lista as etapas usando o fabrico do usuário autenticado", async () => {
        const etapasFabricoA = [{ id: 1, fabrico_id: 1, nome: "Corte" }];
        const etapasFabricoB = [{ id: 2, fabrico_id: 2, nome: "Costura" }];
        findAllForAuthenticatedUser
            .mockResolvedValueOnce(etapasFabricoA)
            .mockResolvedValueOnce(etapasFabricoB);

        await expect(controller.getAll(usuarioFabricoA)).resolves.toEqual(etapasFabricoA);
        await expect(controller.getAll(usuarioFabricoB)).resolves.toEqual(etapasFabricoB);
        expect(findAllForAuthenticatedUser).toHaveBeenNthCalledWith(1, usuarioFabricoA);
        expect(findAllForAuthenticatedUser).toHaveBeenNthCalledWith(2, usuarioFabricoB);
    });
});
