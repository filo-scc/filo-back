import { Test, TestingModule } from '@nestjs/testing';
import { GradeController } from './grade.controller';
import { GradeService } from './grade.service';

describe('GradeController', () => {
  let controller: GradeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GradeController],
      providers: [GradeService],
    }).compile();

    controller = module.get<GradeController>(GradeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
