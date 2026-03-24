import { Test, TestingModule } from '@nestjs/testing';
import { FichaTecnicaService } from './ficha-tecnica.service';

describe('FichaTecnicaService', () => {
  let service: FichaTecnicaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FichaTecnicaService],
    }).compile();

    service = module.get<FichaTecnicaService>(FichaTecnicaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
