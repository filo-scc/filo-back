import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTecidosDto } from "./dto/create-tecidos.dto";
import { UpdateTecidosDto } from "./dto/update-tecidos.dto";
import { ProdutoService } from "src/produto/produto.service";

@Injectable()
export class TecidosService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly produtoService: ProdutoService,
    ) {}

    async create(dataTecidos: CreateTecidosDto) {
        const tecido = dataTecidos;

        const nomeExistente = await this.prisma.tecido.findFirst({
            where: {
                nome: tecido.nome,
                fabrico_id: tecido.fabrico_id,
            },
        });

        if (nomeExistente) {
            throw new ConflictException("Tecido já existe");
        }

        return this.prisma.tecido.create({
            data: tecido,
        });
    }

    async findAll() {
        return this.prisma.tecido.findMany({
            orderBy: { nome: "asc" },
        });
    }

    async findOne(id: number) {
        const tecido = await this.prisma.tecido.findUnique({
            where: { id },
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

    async update(id: number, data: UpdateTecidosDto) {
        return this.prisma.$transaction(async (tx) => {
            const tecidoExistente = await tx.tecido.findUnique({
                where: { id },
            });

            if (!tecidoExistente) {
                throw new NotFoundException("Tecido não encontrado");
            }

            if (data.nome) {
                const nomeExistente = await tx.tecido.findFirst({
                    where: {
                        nome: data.nome,
                        fabrico_id: tecidoExistente.fabrico_id,
                        id: { not: id },
                    },
                });

                if (nomeExistente) {
                    throw new ConflictException("Tecido com esse nome já existe");
                }
            }

            const tecidoAtualizado = await tx.tecido.update({
                where: { id },
                data,
            });

            const novoCustoUnitario =
                tecidoAtualizado.custo_unitario !== null &&
                tecidoAtualizado.custo_unitario !== undefined
                    ? Number(tecidoAtualizado.custo_unitario)
                    : null;

            await this.calculateNewTotalCost(id, tecidoExistente.fabrico_id, novoCustoUnitario, tx);

            return tecidoAtualizado;
        });
    }

    private async calculateNewTotalCost(
        tecidoId: number,
        fabricoId: number,
        novoCustoUnitario: number | null,
        tx: Prisma.TransactionClient,
    ): Promise<void> {
        const produtosAfetados = await tx.produto.findMany({
            where: {
                fabrico_id: fabricoId,
                tecido_id: tecidoId,
            },
        });

        for (const produto of produtosAfetados) {
            if (novoCustoUnitario === null) {
                await tx.produto.update({
                    where: { id: produto.id },
                    data: {
                        custo_tecido: null,
                        custo_total: null,
                    },
                });
            } else {
                const quantidade = Number(produto.quantidade_tecido ?? 0);
                const custoTecidoFinal = Number((quantidade * novoCustoUnitario).toFixed(2));

                const outrosCustos = Number((produto as any).outros_custos ?? 0);
                const custoTotalFinal = Number((custoTecidoFinal + outrosCustos).toFixed(2));

                await tx.produto.update({
                    where: { id: produto.id },
                    data: {
                        custo_tecido: custoTecidoFinal,
                        custo_total: custoTotalFinal,
                    },
                });
            }
        }
    }
    async remove(id: number) {
        return this.prisma.$transaction(async (tx) => {
            const tecidoExistente = await tx.tecido.findUnique({
                where: { id },
            });

            if (!tecidoExistente) {
                throw new NotFoundException("Tecido não encontrado");
            }

            const produtosAfetados = await tx.produto.findMany({
                where: {
                    fabrico_id: tecidoExistente.fabrico_id,
                    tecido_id: id,
                },
            });

            for (const produto of produtosAfetados) {
                const outrosCustos = Number(produto.outros_custos ?? 0);
                const custoTotalFinal = Number((0 + outrosCustos).toFixed(2));

                await tx.produto.update({
                    where: { id: produto.id },
                    data: {
                        tecido_id: null,
                        quantidade_tecido: null,
                        custo_tecido: 0,
                        custo_total: custoTotalFinal,
                    },
                });
            }

            return tx.tecido.delete({
                where: { id },
            });
        });
    }
}
