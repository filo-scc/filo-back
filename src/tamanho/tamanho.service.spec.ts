import { Test, TestingModule } from '@nestjs/testing';
import { TamanhoService } from './tamanho.service';

describe('TamanhoService', () => {
  let service: TamanhoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TamanhoService],
    }).compile();

    service = module.get<TamanhoService>(TamanhoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
