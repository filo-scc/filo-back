import { Test, TestingModule } from "@nestjs/testing";
import { NotificacoesController } from "./notificacoes.controller";
import { NotificacoesService } from "./notificacoes.service";

describe("NotificacoesController", () => {
    let controller: NotificacoesController;
    let service: {
        findMine: jest.Mock;
        marcarComoLida: jest.Mock;
    };

    beforeEach(async () => {
        service = {
            findMine: jest.fn(),
            marcarComoLida: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [NotificacoesController],
            providers: [
                {
                    provide: NotificacoesService,
                    useValue: service,
                },
            ],
        }).compile();

        controller = module.get<NotificacoesController>(NotificacoesController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("lista notificações do usuário autenticado", async () => {
        const notificacoes = [{ id: 1, lida: false }];
        service.findMine.mockResolvedValue(notificacoes);

        await expect(controller.findMine({ user: { id: 7 } })).resolves.toEqual(notificacoes);
        expect(service.findMine).toHaveBeenCalledWith(7);
    });

    it("marca notificação como lida para o usuário autenticado", async () => {
        const resultado = { message: "Notificação marcada como lida" };
        service.marcarComoLida.mockResolvedValue(resultado);

        await expect(controller.marcarComoLida(1, { user: { id: 7 } })).resolves.toEqual(resultado);
        expect(service.marcarComoLida).toHaveBeenCalledWith(1, 7);
    });
});
