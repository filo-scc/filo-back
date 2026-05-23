import { Test, TestingModule } from '@nestjs/testing';
import { PedidoController } from './pedido.controller';
import { PedidoService } from './pedido.service';

describe('PedidoController', () => {
    let controller: PedidoController;

    const mockPedidoService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PedidoController],
            providers: [
                {
                    provide: PedidoService,
                    useValue: mockPedidoService,
                },
            ],
        }).compile();

        controller = module.get<PedidoController>(PedidoController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});