import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FaccaoService } from './faccao.service';
import { CreateFaccaoDto } from './dto/create-faccao.dto';
import { UpdateFaccaoDto } from './dto/update-faccao.dto';

@Controller('faccao')
export class FaccaoController {
  constructor(private readonly faccaoService: FaccaoService) {}

  @Post()
  create(@Body() createFaccaoDto: CreateFaccaoDto) {
    return this.faccaoService.create(createFaccaoDto);
  }

  @Get()
  findAll() {
    return this.faccaoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faccaoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFaccaoDto: UpdateFaccaoDto) {
    return this.faccaoService.update(+id, updateFaccaoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.faccaoService.remove(+id);
  }
}
