import { PartialType } from "@nestjs/mapped-types";
import { CreateTecidosDto } from "./create-tecidos.dto";

export class UpdateTecidosDto extends PartialType(CreateTecidosDto) {}
