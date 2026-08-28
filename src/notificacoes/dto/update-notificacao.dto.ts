import { PartialType } from "@nestjs/mapped-types";
import { CreateNotificacaoDto } from "./create-notificacao.dto";

export class UpdateNotificacaoDto extends PartialType(CreateNotificacaoDto) {}
