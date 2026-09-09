import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTipoProdutoDto } from "./dto/create-tipo-produto.dto";

@Injectable()
export class TipoProdutoService {
    constructor(private prisma: PrismaService) {}

    private assertFabricoImutavel(fabricoInformado: number | undefined, fabricoId: number) {
        if (fabricoInformado !== undefined && Number(fabricoInformado) !== fabricoId) {
            throw new BadRequestException("Não é permitido alterar o fabrico do tipo de produto");
        }
    }

    async create(data: CreateTipoProdutoDto & { fabrico_id?: number }, userFabricoId: number) {
        this.assertFabricoImutavel(data.fabrico_id, userFabricoId);

        const { fabrico_id: _fabricoIdIgnorado, ...dadosCreate } = data;

        try {
            return await this.prisma.tipoProduto.create({
                data: {
                    ...dadosCreate,
                    fabrico_id: userFabricoId,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException(
                        "Já existe um tipo de produto com este nome para este fabrico",
                    );
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            throw error;
        }
    }

    async findAllByFabrico(fabricoId: number) {
        return this.prisma.tipoProduto.findMany({
            where: {
                fabrico_id: fabricoId,
            },
            orderBy: { nome: "asc" },
        });
    }
}
