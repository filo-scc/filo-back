import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
  ParseIntPipe
} from '@nestjs/common';
import { EtapaService } from "./etapa.service";
import { CreateEtapaDto } from "./dto/create-etapa.dto";
import { UpdateEtapaDto } from './dto/update-etapa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("etapas")
export class EtapaController {
    constructor(private readonly etapaService: EtapaService) {}

    @Roles('ADMIN')
    @Post()
    create(@Body() data: CreateEtapaDto) {
        return this.etapaService.create(data);
    }

    @Get()
    getAll() {
        return this.etapaService.getAll();
    }

    @Get("/:fabrico_id")
    findAllByFabricoID(@Param("fabrico_id", ParseIntPipe) fabrico_id: number) {
        return this.etapaService.findAllByFabricoID(Number(fabrico_id));
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.etapaService.getById(id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateEtapaDto) {
        return this.etapaService.update(id, data);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.etapaService.delete(id);
    }
}
