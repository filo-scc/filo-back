import { Test, TestingModule } from '@nestjs/testing';
import { TecidosController } from './tecidos.controller';

describe('TecidosController', () => {
  let controller: TecidosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TecidosController],
    }).compile();

    controller = module.get<TecidosController>(TecidosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
