import { PartialType } from "@nestjs/mapped-types";
import { CreateParceiroProdutoDto } from "./create-parceiroproduto.dto";

export class UpdateParceiroProdutoDto extends PartialType(CreateParceiroProdutoDto) {}
