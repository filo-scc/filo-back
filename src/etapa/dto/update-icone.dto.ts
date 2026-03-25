import { PartialType } from '@nestjs/mapped-types';
import { CreateIconeDto } from '../../etapa/dto/create-icone.dto';

export class UpdateIconeDto extends PartialType(CreateIconeDto) {}
