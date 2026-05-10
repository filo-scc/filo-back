import { PartialType } from "@nestjs/mapped-types";
import { CreateFichaTecnicaItemDto } from "./create-ficha-tecnica-item.dto";

export class UpdateFichaTecnicaItemDto extends PartialType(CreateFichaTecnicaItemDto) {}
