import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { CreateFichaTecnicaDto } from "./dto/create-ficha-tecnica.dto";
import { UpdateFichaTecnicaDto } from "./dto/update-ficha-tecnica.dto";
import { lockPedidos, sincronizarFinalizacaoPedido } from "src/pedido/pedido-finalizacao";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { lineTotal, moneyOrZero, sumMoney, toMoney } from "src/common/utils/money";
import { AuthenticatedUser } from "src/auth/types/authenticated-user";
import { assertFichaEditavel, MSG_FICHA_CONCLUIDA } from "src/common/utils/ficha";

@Injectable()
export class FichaTecnicaService {
    constructor(private prisma: PrismaService) {}

    private async assertPedidoDoFabrico(pedidoId: number, fabricoId: number) {
        const pedido = await this.prisma.pedido.findFirst({
            where: {
                id: Number(pedidoId),
                fabrico_id: Number(fabricoId),
            },
            select: { id: true },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado para este fabrico");
        }
    }

    private findfabricoIdFromUser(user: AuthenticatedUser): number {
        if (!user.fabrico_id) {
            throw new BadRequestException("Usuário não possui um fabrico associado");
        }
        return user.fabrico_id;
    }

    private validateProductionReport(
        data: Partial<
            Pick<
                CreateFichaTecnicaDto,
                "quantidade" | "defeitos_costura" | "defeitos_tecido" | "retiradas" | "sobras"
            >
        >,
        current?: {
            quantidade?: number | null;
            defeitos_costura?: number | null;
            defeitos_tecido?: number | null;
            retiradas?: number | null;
            sobras?: number | null;
        },
    ) {
        const quantidade = Number(data.quantidade ?? current?.quantidade ?? 0);
        const resolveLoss = (
            field: "defeitos_costura" | "defeitos_tecido" | "retiradas" | "sobras",
        ) =>
            Object.prototype.hasOwnProperty.call(data, field)
                ? Number(data[field] ?? 0)
                : Number(current?.[field] ?? 0);
        const perdas = {
            defeitos_costura: resolveLoss("defeitos_costura"),
            defeitos_tecido: resolveLoss("defeitos_tecido"),
            retiradas: resolveLoss("retiradas"),
            sobras: resolveLoss("sobras"),
        };

        if (
            !Number.isInteger(quantidade) ||
            quantidade < 0 ||
            Object.values(perdas).some((valor) => !Number.isInteger(valor) || valor < 0)
        ) {
            throw new BadRequestException(
                "Quantidade e perdas devem ser números inteiros maiores ou iguais a zero",
            );
        }

        const totalPerdas = Object.values(perdas).reduce((total, valor) => total + valor, 0);

        if (totalPerdas > quantidade) {
            throw new BadRequestException(
                "A soma das perdas não pode ser maior que a quantidade da ficha técnica",
            );
        }
    }

    async findAllByFabricoId(fabrico_id: number) {
        try {
            return await this.prisma.fichaTecnica.findMany({
                where: { fabrico_id: Number(fabrico_id), concluida: false },
                include: {
                    produto: {
                        include: {
                            parceiro_produto: {
                                include: {
                                    parceiro: true,
                                },
                            },
                        },
                    },
                    etapa_atual: true,
                    pedido: {
                        include: {
                            cliente: true,
                        },
                    },
                    ficha_parceiro: {
                        include: {
                            parceiro: true,
                        },
                    },
                    grade_versao: {
                        include: {
                            itens: {
                                include: {
                                    tamanho: true,
                                },
                                orderBy: { posicao: "asc" },
                            },
                        },
                    },
                    ficha_tecnica_itens: {
                        include: {
                            cor: true,
                            grade_versao_item: {
                                include: {
                                    tamanho: true,
                                },
                            },
                        },
                    },
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async findAllByEtapaId(id: number, fabrico_id: number) {
        try {
            return await this.prisma.fichaTecnica.findMany({
                where: { etapa_atual_id: Number(id), fabrico_id: fabrico_id },
                include: {
                    produto: true,
                    etapa_atual: true,
                    pedido: {
                        include: {
                            cliente: true,
                        },
                    },
                    grade_versao: {
                        include: {
                            itens: {
                                include: {
                                    tamanho: true,
                                },
                                orderBy: { posicao: "asc" },
                            },
                        },
                    },
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async findOne(id: number, fabrico_id: number) {
        const fichaBase = await this.prisma.fichaTecnica.findFirst({
            where: { id, fabrico_id: fabrico_id },
            select: { produto_id: true },
        });

        if (!fichaBase) {
            throw new NotFoundException("ficha não encontrada");
        }

        const ficha = await this.prisma.fichaTecnica.findFirst({
            where: { id, fabrico_id: fabrico_id },
            include: {
                produto: {
                    include: {
                        tecido: true,
                        tipo_produto: true,
                    },
                },
                etapa_atual: true,
                pedido: {
                    include: {
                        cliente: true,
                    },
                },
                grade_versao: {
                    include: {
                        grade: true,
                        itens: {
                            include: {
                                tamanho: true,
                            },
                            orderBy: { posicao: "asc" },
                        },
                    },
                },
                fichas_etapas: true,
                ficha_tecnica_itens: {
                    include: {
                        cor: true,
                        grade_versao_item: {
                            include: {
                                tamanho: true,
                            },
                        },
                    },
                    orderBy: [{ cor_id: "asc" }, { grade_versao_item: { posicao: "asc" } }],
                },
                ficha_parceiro: {
                    include: {
                        parceiro: {
                            include: {
                                parceiro_produto: {
                                    where: {
                                        produto_id: fichaBase.produto_id,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!ficha) {
            throw new NotFoundException("Ficha não encontrada");
        }

        return ficha;
    }

    async update(id: number, data: UpdateFichaTecnicaDto, user: AuthenticatedUser) {
        const fabricoId = this.findfabricoIdFromUser(user);
        const ficha = await this.findOne(id, fabricoId);

        assertFichaEditavel(ficha, data);
        if (ficha.concluida) {
            return ficha;
        }

        if (ficha.pedido_id) {
            await this.assertPedidoEditavel(ficha.pedido_id);
        }

        if (data.produto_id && data.produto_id !== ficha.produto_id) {
            throw new BadRequestException("Não é permitido alterar o produto da ficha");
        }

        const reportOrQuantityChanged = [
            data.quantidade,
            data.defeitos_costura,
            data.defeitos_tecido,
            data.retiradas,
            data.sobras,
        ].some((value) => value !== undefined);

        if (reportOrQuantityChanged) {
            this.validateProductionReport(data, ficha);
        }

        const produto = await this.prisma.produto.findFirst({
            where: {
                id: ficha.produto_id,
                fabrico_id: fabricoId,
            },
            select: {
                id: true,
                grade_versao_id: true,
            },
        });

        if (!produto) {
            throw new BadRequestException("O produto da ficha não pertence ao fabrico informado");
        }

        if (data.pedido_id !== undefined && data.pedido_id !== null) {
            await this.assertPedidoDoFabrico(Number(data.pedido_id), Number(fabricoId));
            await this.assertPedidoEditavel(Number(data.pedido_id));
        }

        const payload = data as UpdateFichaTecnicaDto & { grade_versao_id?: number };
        const novaGradeVersaoId = payload.grade_versao_id
            ? Number(payload.grade_versao_id)
            : undefined;

        if (novaGradeVersaoId && novaGradeVersaoId !== ficha.grade_versao_id) {
            const gradeVersao = await this.prisma.gradeVersao.findFirst({
                where: {
                    id: novaGradeVersaoId,
                    ativo: true,
                    grade: {
                        ativo: true,
                        fabrico_grades: {
                            some: {
                                fabrico_id: fabricoId,
                                ativo: true,
                            },
                        },
                    },
                },
                select: {
                    id: true,
                    grade_id: true,
                },
            });

            if (!gradeVersao) {
                throw new BadRequestException(
                    "A nova versão de grade informada é inválida ou está inativa",
                );
            }
        }

        try {
            return await this.prisma.$transaction(async (tx) => {
                // Pedido antes da ficha: mesma ordem de trava do cron e do updateCompleto.
                const pedidosEnvolvidos = [
                    ...new Set(
                        [ficha.pedido_id, data.pedido_id]
                            .filter((pedidoId) => pedidoId !== undefined && pedidoId !== null)
                            .map(Number),
                    ),
                ];

                await lockPedidos(tx, pedidosEnvolvidos);
                // Revalida com o pedido travado: o cron pode ter finalizado após a checagem inicial.
                for (const pedidoId of pedidosEnvolvidos) {
                    await this.assertPedidoEditavel(pedidoId, tx);
                }

                // Revalida com o lock: a ficha pode ter sido concluída após a leitura inicial.
                const fichaTx = await tx.fichaTecnica.findUnique({
                    where: { id },
                    select: { concluida: true, grade_versao_id: true },
                });

                if (!fichaTx) {
                    throw new NotFoundException("Ficha não encontrada");
                }

                if (fichaTx.concluida) {
                    throw new ConflictException(MSG_FICHA_CONCLUIDA);
                }

                if (novaGradeVersaoId && novaGradeVersaoId !== fichaTx.grade_versao_id) {
                    await tx.fichaTecnicaItem.deleteMany({ where: { ficha_tecnica_id: id } });
                }

                const {
                    concluida: _concluida,
                    etapa_atual_id: _etapa,
                    grade_versao_id: _grade,
                    ...dadosEditaveis
                } = data as UpdateFichaTecnicaDto & {
                    concluida?: boolean;
                    etapa_atual_id?: number;
                    grade_versao_id?: number;
                };

                const fichaAtualizada = await tx.fichaTecnica.update({
                    where: { id },
                    data: {
                        ...dadosEditaveis,
                        fabrico_id: fabricoId,
                        ...(novaGradeVersaoId ? { grade_versao_id: novaGradeVersaoId } : {}),
                    },
                    include: {
                        produto: true,
                        etapa_atual: true,
                        grade_versao: {
                            include: {
                                itens: {
                                    include: {
                                        tamanho: true,
                                    },
                                    orderBy: { posicao: "asc" },
                                },
                            },
                        },
                    },
                });

                if (ficha.pedido_id) {
                    await this.sincronizarPedido(tx, ficha.pedido_id);
                    await sincronizarFinalizacaoPedido(tx, ficha.pedido_id);
                }

                return fichaAtualizada;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2004") {
                throw new BadRequestException(
                    "A soma das perdas não pode ser maior que a quantidade da ficha técnica",
                );
            }

            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    private async assertPedidoEditavel(
        pedidoId: number,
        db: Prisma.TransactionClient | PrismaService = this.prisma,
    ) {
        const pedido = await db.pedido.findFirst({
            where: { id: pedidoId },
            select: { finalizado: true },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado para este fabrico");
        }

        if (pedido.finalizado) {
            throw new ConflictException("Pedido finalizado não pode ser alterado ou excluído");
        }
    }

    async sincronizarPedido(tx: Prisma.TransactionClient, pedidoId: number) {
        await tx.$queryRaw`SELECT id FROM "pedidos" WHERE id = ${pedidoId} FOR UPDATE`;

        const pedido = await tx.pedido.findUnique({
            where: { id: pedidoId },
            select: { cliente_id: true },
        });

        if (!pedido) return;

        const fichasDoPedido = await tx.fichaTecnica.findMany({
            where: { pedido_id: pedidoId },
            select: {
                quantidade: true,
                produto: {
                    select: {
                        id: true,
                        custo_total: true,
                    },
                },
            },
        });

        const quantidadeTotal = fichasDoPedido.reduce((soma, f) => soma + (f.quantidade ?? 0), 0);

        const custoTotal = sumMoney(
            fichasDoPedido.map((f) => lineTotal(f.quantidade ?? 0, f.produto?.custo_total)),
        );

        let valorTotal: Prisma.Decimal | null = null;

        if (pedido.cliente_id) {
            const produtoIds = [
                ...new Set(
                    fichasDoPedido.map((f) => f.produto?.id).filter((id): id is number => !!id),
                ),
            ];

            const precosCliente = await tx.clienteProduto.findMany({
                where: {
                    cliente_id: pedido.cliente_id,
                    produto_id: { in: produtoIds },
                },
                select: { produto_id: true, preco_padrao: true },
            });

            const mapaPrecos = new Map(
                precosCliente.map((p) => [p.produto_id, moneyOrZero(p.preco_padrao)]),
            );

            valorTotal = sumMoney(
                fichasDoPedido.map((f) => {
                    const preco = mapaPrecos.get(f.produto?.id ?? -1);
                    return lineTotal(f.quantidade ?? 0, preco);
                }),
            );
        }

        await tx.pedido.update({
            where: { id: pedidoId },
            data: {
                quantidade: quantidadeTotal,
                custo_total: toMoney(custoTotal),
                valor_total: valorTotal !== null ? toMoney(valorTotal) : null,
            },
        });
    }

    async remove(id: number, user: AuthenticatedUser) {
        const fabricoId = this.findfabricoIdFromUser(user);
        const ficha = await this.findOne(id, fabricoId);

        if (ficha.concluida) {
            throw new ConflictException(MSG_FICHA_CONCLUIDA);
        }

        if (ficha.pedido_id) {
            await this.assertPedidoEditavel(ficha.pedido_id);
        }

        await this.prisma.$transaction(async (tx) => {
            if (ficha.pedido_id) {
                await lockPedidos(tx, [ficha.pedido_id]);
                await this.assertPedidoEditavel(ficha.pedido_id, tx);
            }

            // deleteMany com concluida:false garante a regra mesmo com corrida
            const { count } = await tx.fichaTecnica.deleteMany({
                where: { id, concluida: false },
            });

            if (count === 0) {
                throw new ConflictException(MSG_FICHA_CONCLUIDA);
            }

            if (ficha.pedido_id) {
                await this.sincronizarPedido(tx, ficha.pedido_id);
                await sincronizarFinalizacaoPedido(tx, ficha.pedido_id);
            }
        });

        return "Ficha técnica excluída com sucesso";
    }
}
