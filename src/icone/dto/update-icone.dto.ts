import { PartialType } from '@nestjs/mapped-types';
import { CreateIconeDto } from './create-icone.dto';

export class UpdateIconeDto extends PartialType(CreateIconeDto) {}
