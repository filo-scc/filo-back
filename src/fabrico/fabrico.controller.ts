import { Controller, Post, Body } from '@nestjs/common';
import { FabricoService } from './fabrico.service';
import { CreateFabricoDto } from './dto/create-fabrico.dto';

@Controller('fabricos')
export class FabricoController {
  constructor(private readonly fabricoService: FabricoService) {}

  @Post()
  create(@Body() data: CreateFabricoDto) {
    return this.fabricoService.create(data);
  }
}
