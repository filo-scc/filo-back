import { PartialType } from '@nestjs/mapped-types';
import { CreateFichaTecnicaDto } from './create-ficha-tecnica.dto';

export class UpdateFichaTecnicaDto extends PartialType(CreateFichaTecnicaDto) {}
