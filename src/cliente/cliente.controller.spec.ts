import { Test, TestingModule } from "@nestjs/testing";
import { ClienteController } from "./cliente.controller";
import { ClienteService } from "./cliente.service";
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

describe("ClienteController", () => {
    let controller: ClienteController;
    const create = jest.fn();
    const findAllByFabricoID = jest.fn();
    const findOne = jest.fn();
    const update = jest.fn();
    const remove = jest.fn();

    const user: BusinessAuthenticatedUser = {
        id: 1,
        email: "gerente@teste.com",
        nome: "Gerente",
        foto_de_perfil: null,
        cargo: "GERENTE",
        fabrico_id: 10,
        fabrico: { id: 10, ativo: true },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ClienteController],
            providers: [
                {
                    provide: ClienteService,
                    useValue: {
                        create,
                        findAllByFabricoID,
                        findOne,
                        update,
                        remove,
                    },
                },
            ],
        }).compile();

        controller = module.get<ClienteController>(ClienteController);
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("create usa fabrico_id do usuario autenticado", async () => {
        const data = { nome: "Cliente", status: true } as any;
        create.mockResolvedValue({ message: "ok" });

        await controller.create(data, user);

        expect(create).toHaveBeenCalledWith(data, user.fabrico_id);
    });

    it("findAll lista apenas clientes do fabrico do usuario", async () => {
        findAllByFabricoID.mockResolvedValue([]);

        await controller.findAll(user);

        expect(findAllByFabricoID).toHaveBeenCalledWith(user.fabrico_id);
    });

    it("findOne escopa pelo fabrico do usuario", async () => {
        findOne.mockResolvedValue({ id: 1 });

        await controller.findOne(1, user);

        expect(findOne).toHaveBeenCalledWith(1, user.fabrico_id);
    });

    it("update escopa pelo fabrico do usuario", async () => {
        const data = { nome: "Novo" } as any;
        update.mockResolvedValue({ message: "ok" });

        await controller.update(1, data, user);

        expect(update).toHaveBeenCalledWith(1, data, user.fabrico_id);
    });

    it("remove escopa pelo fabrico do usuario", async () => {
        remove.mockResolvedValue({ id: 1 });

        await controller.remove(1, user);

        expect(remove).toHaveBeenCalledWith(1, user.fabrico_id);
    });
});
