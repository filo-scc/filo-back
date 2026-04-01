import { PartialType } from "@nestjs/mapped-types";
import { CreateFichaEtapaDto } from "./create-ficha-etapa.dto";

export class UpdateFichaEtapaDto extends PartialType(CreateFichaEtapaDto) {}