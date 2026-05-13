import { PartialType } from "@nestjs/mapped-types";

import { CreateAviamentoDto } from "./create-aviamento.dto";

export class UpdateAviamentoDto extends PartialType(CreateAviamentoDto) {}
