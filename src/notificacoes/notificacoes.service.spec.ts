import { Test, TestingModule } from '@nestjs/testing';
import { NotificacoesService } from './notificacoes.service';

describe('NotificacoesService', () => {
  let service: NotificacoesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificacoesService],
    }).compile();

    service = module.get<NotificacoesService>(NotificacoesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
