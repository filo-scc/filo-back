import {
    NotFoundException,
    Injectable,
    ConflictException,
    BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProdutoDto } from "./dto/create-produto.dto";
import { UpdateProduto } from "./dto/update-produto.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class ProdutoService {
    constructor(private prisma: PrismaService) {}

    private normalizarNome(valor: string | null | undefined) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLocaleLowerCase("pt-BR")
            .replace(/\s+/g, " ");
    }

    async recalcularCustoTotal(produtoId: number, db?: Prisma.TransactionClient): Promise<number> {
        if (!db) {
            return this.prisma.$transaction((tx) => this.recalcularCustoTotal(produtoId, tx));
        }

        await db.$queryRaw(
            Prisma.sql`SELECT "id" FROM "produtos" WHERE "id" = ${produtoId} FOR UPDATE`,
        );

        const produto = await db.produto.findUnique({
            where: { id: produtoId },
            include: {
                tecido: true,
                produtoAviamentos: {
                    include: { aviamento: true },
                },
                parceiro_produto: {
                    include: { parceiro: true },
                },
            },
        });

        if (!produto) {
            throw new NotFoundException("Produto não encontrado");
        }

        const etapasAtivas = await db.etapa.findMany({
            where: {
                fabrico_id: produto.fabrico_id,
                ativa: true,
            },
            orderBy: { ordem: "asc" },
        });

        const etapasParaCusto = etapasAtivas.slice(0, -1);
        const custoEtapas = etapasParaCusto.reduce((total, etapa) => {
            const nomeEtapa = this.normalizarNome(etapa.nome);
            const precos = produto.parceiro_produto
                .filter((vinculo) => this.normalizarNome(vinculo.parceiro?.categoria) === nomeEtapa)
                .map((vinculo) => Number(vinculo.preco))
                .filter((preco) => Number.isFinite(preco) && preco > 0);

            if (!precos.length) return total;

            const media = precos.reduce((soma, preco) => soma + preco, 0) / precos.length;
            return total + media;
        }, 0);

        const custoTecido =
            produto.custo_tecido !== null && produto.custo_tecido !== undefined
                ? Number(produto.custo_tecido)
                : Number(produto.quantidade_tecido || 0) *
                  Number(produto.tecido?.custo_unitario || 0);

        const custoAviamentos = produto.produtoAviamentos.reduce((total, vinculo) => {
            if (vinculo.custo !== null && vinculo.custo !== undefined) {
                return total + Number(vinculo.custo);
            }

            return (
                total +
                Number(vinculo.quantidade || 0) * Number(vinculo.aviamento?.custo_unitario || 0)
            );
        }, 0);

        const custoTotal = Number(
            (
                custoTecido +
                custoAviamentos +
                custoEtapas +
                Number(produto.custo_operacional || 0) +
                Number(produto.outros_custos || 0)
            ).toFixed(2),
        );

        await db.produto.update({
            where: { id: produtoId },
            data: { custo_total: custoTotal },
        });

        return custoTotal;
    }

    async recalcularCustosTotais(
        produtoIds: number[],
        db?: Prisma.TransactionClient,
    ): Promise<void> {
        if (!db) {
            await this.prisma.$transaction((tx) => this.recalcularCustosTotais(produtoIds, tx));
            return;
        }

        const idsUnicos = [...new Set(produtoIds)].sort((a, b) => a - b);

        for (const produtoId of idsUnicos) {
            await this.recalcularCustoTotal(produtoId, db);
        }
    }

    async create(data: CreateProdutoDto) {
        if (data.grade_versao_id) {
            const grade = await this.prisma.gradeVersao.findFirst({
                where: {
                    id: data.grade_versao_id,
                    ativo: true,
                },
            });

            if (!grade) {
                throw new BadRequestException("Versão de grade inválida ou inativa");
            }
        }

        try {
            return await this.prisma.produto.create({
                data: { ...data },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Já existe um produto com este nome para este fabrico");
            }
            throw error;
        }
    }

    async findAll() {
        return this.prisma.produto.findMany();
    }

    async getById(id: number) {
        const produto = await this.prisma.produto.findUnique({
            where: { id },
            include: { tecido: true },
        });

        if (!produto) {
            throw new NotFoundException("Produto não encontrado");
        }

        return produto;
    }

    async delete(id: number) {
        const produto = await this.prisma.produto.findUnique({ where: { id } });
        if (produto) {
            await this.prisma.produto.delete({ where: { id } });
            return `O produto com o id ${id} foi deletado com sucesso`;
        } else {
            throw new NotFoundException("Produto não encontrado");
        }
    }

    async update(id: number, dados: UpdateProduto) {
        const produto = await this.prisma.produto.findUnique({
            where: { id },
        });

        if (!produto) {
            throw new NotFoundException("Produto não encontrado");
        }

        if (dados.grade_versao_id) {
            const grade = await this.prisma.gradeVersao.findFirst({
                where: {
                    id: dados.grade_versao_id,
                    ativo: true,
                },
            });

            if (!grade) {
                throw new BadRequestException("Versão de grade inválida ou inativa");
            }
        }

        try {
            const camposQueAlteramCusto: (keyof UpdateProduto)[] = [
                "custo_tecido",
                "quantidade_tecido",
                "tecido_id",
                "custo_operacional",
                "outros_custos",
                "custo_total",
                "fabrico_id",
            ];
            const deveRecalcular = camposQueAlteramCusto.some((campo) => campo in dados);

            if (deveRecalcular) {
                await this.prisma.$transaction(async (tx) => {
                    await tx.produto.update({
                        where: { id },
                        data: { ...dados },
                    });
                    await this.recalcularCustoTotal(id, tx);
                });
            } else {
                await this.prisma.produto.update({
                    where: { id },
                    data: { ...dados },
                });
            }

            return `O produto com o id ${id} foi atualizado`;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Já existe um produto com este nome para este fabrico");
            }
            throw error;
        }
    }

    async findAllFabrico(fabrico_id: number) {
        const produtos = await this.prisma.produto.findMany({
            where: { fabrico_id: fabrico_id },
            include: {
                tecido: true,
            },
        });
        return produtos;
    }

    async getUnassociatedProductsForClient(cliente_id: number, fabrico_id: number) {
        return this.prisma.produto.findMany({
            where: {
                fabrico_id: fabrico_id,
                // Filtra produtos que NÃO estão na tabela clienteProduto para este cliente
                cliente_produto: {
                    none: {
                        cliente_id: cliente_id,
                    },
                },
            },
        });
    }
}
