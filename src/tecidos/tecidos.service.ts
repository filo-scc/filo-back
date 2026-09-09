import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTecidosDto } from "./dto/create-tecidos.dto";
import { UpdateTecidosDto } from "./dto/update-tecidos.dto";
import { ProdutoService } from "../produto/produto.service";

@Injectable()
export class TecidosService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly produtoService: ProdutoService,
    ) {}

    private assertFabricoImutavel(fabricoInformado: number | undefined, fabricoId: number) {
        if (fabricoInformado !== undefined && Number(fabricoInformado) !== fabricoId) {
            throw new BadRequestException("Não é permitido alterar o fabrico do tecido");
        }
    }

    async create(dataTecidos: CreateTecidosDto, fabricoId: number) {
        this.assertFabricoImutavel(dataTecidos.fabrico_id, fabricoId);

        const { fabrico_id: _fabricoIdIgnorado, ...dadosTecido } = dataTecidos;

        try {
            return await this.prisma.tecido.create({
                data: {
                    ...dadosTecido,
                    fabrico_id: fabricoId,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Tecido já existe");
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Fabrico não encontrado");
                }
            }
            throw error;
        }
    }

    async findAll(fabricoId: number) {
        return this.prisma.tecido.findMany({
            where: { fabrico_id: fabricoId },
            orderBy: { nome: "asc" },
        });
    }

    async findOne(id: number, fabricoId: number) {
        const tecido = await this.prisma.tecido.findFirst({
            where: { id, fabrico_id: fabricoId },
        });

        if (!tecido) {
            throw new NotFoundException("Tecido não encontrado");
        }

        return tecido;
    }

    async findAllByFabrico(idFabrico: number) {
        return this.prisma.tecido.findMany({
            where: { fabrico_id: idFabrico },
            orderBy: { nome: "asc" },
        });
    }

    async update(id: number, data: UpdateTecidosDto, fabricoId: number) {
        this.assertFabricoImutavel(data.fabrico_id, fabricoId);

        const { fabrico_id: _fabricoIdIgnorado, ...dadosUpdate } = data;

        try {
            return await this.prisma.$transaction(async (tx) => {
                const tecidoExistente = await tx.tecido.findFirst({
                    where: { id, fabrico_id: fabricoId },
                });

                if (!tecidoExistente) {
                    throw new NotFoundException("Tecido não encontrado");
                }

                const tecidoAtualizado = await tx.tecido.update({
                    where: { id: tecidoExistente.id },
                    data: {
                        ...dadosUpdate,
                        fabrico_id: tecidoExistente.fabrico_id,
                    },
                });

                const produtosAfetados = await tx.produto.findMany({
                    where: {
                        fabrico_id: tecidoExistente.fabrico_id,
                        tecido_id: id,
                    },
                    select: { id: true },
                });

                for (const produto of produtosAfetados) {
                    await this.produtoService.recalcularCustoTotal(produto.id, tx);
                }

                return tecidoAtualizado;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Tecido com esse nome já existe");
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            throw error;
        }
    }

    async remove(id: number, fabricoId: number) {
        return this.prisma.$transaction(async (tx) => {
            const tecidoExistente = await tx.tecido.findFirst({
                where: { id, fabrico_id: fabricoId },
            });

            if (!tecidoExistente) {
                throw new NotFoundException("Tecido não encontrado");
            }

            const produtosAfetados = await tx.produto.findMany({
                where: {
                    fabrico_id: tecidoExistente.fabrico_id,
                    tecido_id: id,
                },
                select: { id: true },
            });

            await tx.produto.updateMany({
                where: {
                    fabrico_id: tecidoExistente.fabrico_id,
                    tecido_id: id,
                },
                data: {
                    tecido_id: null,
                    quantidade_tecido: null,
                    custo_tecido: 0,
                },
            });

            for (const produto of produtosAfetados) {
                await this.produtoService.recalcularCustoTotal(produto.id, tx);
            }

            return tx.tecido.delete({
                where: { id: tecidoExistente.id },
            });
        });
    }
}
