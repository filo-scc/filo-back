import { Test, TestingModule } from '@nestjs/testing';
import { TecidosService } from './tecidos.service';

describe('TecidosService', () => {
  let service: TecidosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TecidosService],
    }).compile();

    service = module.get<TecidosService>(TecidosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
