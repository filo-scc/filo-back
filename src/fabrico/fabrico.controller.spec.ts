import { Test, TestingModule } from '@nestjs/testing';
import { FabricoController } from './fabrico.controller';

describe('FabricoController', () => {
  let controller: FabricoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FabricoController],
    }).compile();

    controller = module.get<FabricoController>(FabricoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
