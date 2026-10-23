import { OmitType, PartialType } from "@nestjs/mapped-types";
import { CreateFichaTecnicaDto } from "./create-ficha-tecnica.dto";

export class UpdateFichaTecnicaDto extends PartialType(
    OmitType(CreateFichaTecnicaDto, ["etapa_atual_id"] as const),
) {}
