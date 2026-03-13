import { PartialType } from '@nestjs/mapped-types';
import { CreateFaccaoDto } from './create-faccao.dto';

export class UpdateFaccaoDto extends PartialType(CreateFaccaoDto) {}
