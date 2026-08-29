import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateFichaTecnicaDto } from "./dto/create-ficha-tecnica.dto";
import { UpdateFichaTecnicaDto } from "./dto/update-ficha-tecnica.dto";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";
import { EtapaService } from "../etapa/etapa.service";
import { FabricoService } from "../fabrico/fabrico.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class FichaTecnicaService {
    constructor(
        private prisma: PrismaService,
        private readonly produtoService: ProdutoService,
        private readonly fabricoService: FabricoService,
        private readonly etapaService: EtapaService,
    ) {}

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

    async create(data: CreateFichaTecnicaDto, fabricoId: number) {
        const produto_id = Number(data.produto_id);
        const fabrico_id = Number(fabricoId);

        this.validateProductionReport(data);

        await Promise.all([
            this.produtoService.getById(produto_id),
            this.fabricoService.getById(fabrico_id),
        ]);

        const produto = await this.prisma.produto.findFirst({
            where: {
                id: produto_id,
                fabrico_id,
            },
            select: {
                grade_versao_id: true,
            },
        });

        if (!produto) {
            throw new NotFoundException("Produto não encontrado para este fabrico");
        }

        if (!produto.grade_versao_id) {
            throw new BadRequestException("Produto não possui grade definida");
        }

        const grade_versao_id = produto.grade_versao_id;

        const gradeItens = await this.prisma.gradeVersaoItem.findMany({
            where: {
                grade_versao_id,
            },
            select: {
                id: true,
            },
        });

        if (gradeItens.length === 0) {
            throw new BadRequestException("Grade sem tamanhos configurados");
        }

        const ultimaFichaTecnica = await this.prisma.fichaTecnica.findFirst({
            where: {
                fabrico_id,
            },
            orderBy: {
                id: "desc",
            },
        });
        const numero = (ultimaFichaTecnica?.numero ?? 0) + 1;

        return this.prisma.$transaction(async (tx) => {
            // 1. cria ficha
            const ficha = await tx.fichaTecnica.create({
                data: {
                    ...data,
                    numero,
                    grade_versao_id,
                    produto_id,
                    fabrico_id,
                },
            });

            // ⚠️ IMPORTANTE:
            // não cria cores automaticamente (usuário define depois)

            // 2. cria estrutura base (sem cor ainda)
            // 👉 aqui você pode decidir:
            // opção A: criar vazio (recomendado)
            // opção B: criar placeholder

            // vou seguir opção A (melhor UX e menos lixo no banco)

            return ficha;
        });
    }

    async findAllByFabricoId(id: number) {
        try {
            return await this.prisma.fichaTecnica.findMany({
                where: { fabrico_id: Number(id), concluida: false },
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

    async findAllByEtapaId(id: number) {
        try {
            return this.prisma.fichaTecnica.findMany({
                where: { etapa_atual_id: Number(id) },
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

    async findOne(id: number) {
        const fichaBase = await this.prisma.fichaTecnica.findUnique({
            where: { id },
            select: { produto_id: true },
        });

        if (!fichaBase) {
            throw new NotFoundException("ficha não encontrada");
        }

        const ficha = await this.prisma.fichaTecnica.findUnique({
            where: { id },
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

    async update(id: number, data: UpdateFichaTecnicaDto, fabricoId: number) {
        const ficha = await this.findOne(id);

        if (ficha.fabrico_id !== Number(fabricoId)) {
            throw new NotFoundException("Ficha não encontrada");
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

        if (data.etapa_atual_id) {
            const etapa = await this.etapaService.getById(Number(data.etapa_atual_id));

            if (etapa.fabrico_id !== fabricoId) {
                throw new BadRequestException(
                    "A etapa não pertence ao mesmo fabrico da ficha técnica",
                );
            }
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
                if (novaGradeVersaoId && novaGradeVersaoId !== ficha.grade_versao_id) {
                    await tx.fichaTecnicaItem.deleteMany({
                        where: { ficha_tecnica_id: id },
                    });
                }

                const fichaAtualizada = await tx.fichaTecnica.update({
                    where: { id },
                    data: {
                        ...data,
                        fabrico_id: fabricoId,
                        grade_versao_id: novaGradeVersaoId ?? ficha.grade_versao_id,
                        etapa_atual_id: data.etapa_atual_id
                            ? Number(data.etapa_atual_id)
                            : data.etapa_atual_id === null
                              ? null
                              : ficha.etapa_atual_id,
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

                if (data.quantidade !== undefined && ficha.pedido_id) {
                    await this.sincronizarPedido(tx, ficha.pedido_id);
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

    private async sincronizarPedido(tx: Prisma.TransactionClient, pedidoId: number) {
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

        const custoTotal = fichasDoPedido.reduce((soma, f) => {
            const custo = Number(f.produto?.custo_total ?? 0);
            return soma + (f.quantidade ?? 0) * custo;
        }, 0);

        let valorTotal: number | null = null;

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
                precosCliente.map((p) => [p.produto_id, Number(p.preco_padrao) || 0]),
            );

            valorTotal = fichasDoPedido.reduce((soma, f) => {
                const preco = mapaPrecos.get(f.produto?.id ?? -1) ?? 0;
                return soma + (f.quantidade ?? 0) * preco;
            }, 0);
        }

        await tx.pedido.update({
            where: { id: pedidoId },
            data: {
                quantidade: quantidadeTotal,
                custo_total: Number(custoTotal.toFixed(2)),
                valor_total: valorTotal !== null ? Number(valorTotal.toFixed(2)) : null,
            },
        });
    }

    async remove(id: number) {
        await this.findOne(id);

        await this.prisma.fichaTecnica.delete({
            where: { id },
        });

        return "Ficha técnica excluída com sucesso";
    }
}
