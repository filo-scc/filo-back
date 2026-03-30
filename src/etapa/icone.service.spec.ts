import { Test, TestingModule } from '@nestjs/testing';
import { IconeService } from './icone.service';

describe('IconeService', () => {
  let service: IconeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IconeService],
    }).compile();

    service = module.get<IconeService>(IconeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
