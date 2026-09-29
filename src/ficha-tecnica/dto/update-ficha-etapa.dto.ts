import { PartialType, OmitType } from "@nestjs/mapped-types";
import { CreateFichaEtapaDto } from "./create-ficha-etapa.dto";

export class UpdateFichaEtapaDto extends PartialType(
    OmitType(CreateFichaEtapaDto, ["ficha_tecnica_id", "etapa_id"] as const),
) {}
