import { PartialType } from "@nestjs/mapped-types";
import { CreateFaccaoProdutoDto } from "./create-faccaoproduto.dto";

export class UpdateFaccaoProdutoDto extends PartialType(CreateFaccaoProdutoDto) {}