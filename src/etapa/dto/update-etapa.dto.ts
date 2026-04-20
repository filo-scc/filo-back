import { PartialType } from "@nestjs/mapped-types";
import { CreateEtapaDto } from "../../etapa/dto/create-etapa.dto";

export class UpdateEtapaDto extends PartialType(CreateEtapaDto) {}
