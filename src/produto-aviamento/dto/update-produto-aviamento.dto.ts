import { PartialType } from "@nestjs/mapped-types";
import { CreateProdutoAviamentoDto } from "./create-produto-aviamento.dto";

export class UpdateProdutoAviamentoDto extends PartialType(CreateProdutoAviamentoDto) {}
