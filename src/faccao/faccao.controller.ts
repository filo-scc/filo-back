import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { FaccaoService } from './faccao.service';
import { CreateFaccaoDto } from './dto/create-faccao.dto';
import { UpdateFaccaoDto } from './dto/update-faccao.dto';

@Controller('faccoes')
export class FaccaoController {
  constructor(private readonly faccaoService: FaccaoService) {}

  @Post()
  create(@Body() data: CreateFaccaoDto, @Req() req) {
    return this.faccaoService.create(1, data);
  }

  @Get()
  findAll() {
    return this.faccaoService.getAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faccaoService.getById(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() req, @Body() data: UpdateFaccaoDto) {
    return this.faccaoService.update(+id, 1, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.faccaoService.delete(+id);
  }
}
