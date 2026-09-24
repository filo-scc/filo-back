import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateProdutoDto } from "./dto/create-produto.dto";
import { UpdateProduto } from "./dto/update-produto.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthenticatedUser } from "src/auth/types/authenticated-user";

@Injectable()
export class ProdutoService {
    constructor(private prisma: PrismaService) {}

    private assertFabricoImutavel(fabricoInformado: number | undefined, fabricoId: number) {
        if (fabricoInformado !== undefined && Number(fabricoInformado) !== fabricoId) {
            throw new BadRequestException("Não é permitido alterar o fabrico do produto");
        }
    }

    private normalizarNome(valor: string | null | undefined) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLocaleLowerCase("pt-BR")
            .replace(/\s+/g, " ");
    }

    private getFabricoId(user: AuthenticatedUser): number {
        if (!user?.fabrico_id) {
            throw new BadRequestException("Usuário não possui um fabrico associado");
        }
        return user.fabrico_id;
    }

    async bloquearProdutosParaRecalculo(
        produtoIds: number[],
        db: Prisma.TransactionClient,
    ): Promise<void> {
        const idsUnicos = [...new Set(produtoIds)].sort((a, b) => a - b);

        for (const produtoId of idsUnicos) {
            await db.$queryRaw(
                Prisma.sql`SELECT "id" FROM "produtos" WHERE "id" = ${produtoId} FOR UPDATE`,
            );
        }
    }

    async recalcularCustoTotal(produtoId: number, db?: Prisma.TransactionClient): Promise<number> {
        if (!db) {
            return this.prisma.$transaction((tx) => this.recalcularCustoTotal(produtoId, tx));
        }

        await this.bloquearProdutosParaRecalculo([produtoId], db);

        const produto = await db.produto.findUnique({
            where: { id: produtoId },
            include: {
                tecido: true,
                produtoAviamentos: { include: { aviamento: true } },
                parceiro_produto: { include: { parceiro: true } },
            },
        });

        if (!produto) {
            throw new NotFoundException("Produto não encontrado");
        }

        let custoTecido = 0;
        if (produto.tecido && produto.quantidade_tecido) {
            custoTecido = Number(produto.quantidade_tecido) * Number(produto.tecido.custo_unitario);
        } else if (produto.custo_tecido !== null && produto.custo_tecido !== undefined) {
            custoTecido = Number(produto.custo_tecido);
        }

        const etapasAtivas = await db.etapa.findMany({
            where: { fabrico_id: produto.fabrico_id, ativa: true },
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
            return total + precos.reduce((soma, preco) => soma + preco, 0) / precos.length;
        }, 0);

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
            data: {
                custo_tecido: custoTecido,
                custo_total: custoTotal,
            },
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

        await this.bloquearProdutosParaRecalculo(idsUnicos, db);

        for (const produtoId of idsUnicos) {
            await this.recalcularCustoTotal(produtoId, db);
        }
    }

    async create(data: CreateProdutoDto, user: AuthenticatedUser) {
        const userFabricoId = this.getFabricoId(user);
        this.assertFabricoImutavel(data.fabrico_id, userFabricoId);

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

        const { ...dadosCreate } = data;

        try {
            return await this.prisma.produto.create({
                data: {
                    ...dadosCreate,
                    fabrico_id: userFabricoId,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException(
                        "Já existe um produto com este nome para este fabrico",
                    );
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            throw error;
        }
    }

    async findAll(user: AuthenticatedUser) {
        const userFabricoId = this.getFabricoId(user);
        return this.prisma.produto.findMany({
            where: {
                fabrico_id: userFabricoId,
                ativo: true,
            },
            orderBy: { nome: "asc" },
        });
    }

    async findAllFabrico(user: AuthenticatedUser) {
        const userFabricoId = this.getFabricoId(user);
        return this.prisma.produto.findMany({
            where: {
                fabrico_id: userFabricoId,
                ativo: true,
            },
            include: {
                tecido: true,
            },
            orderBy: { nome: "asc" },
        });
    }

    async getById(id: number, user: AuthenticatedUser, incluirInativos = true) {
        const userFabricoId = this.getFabricoId(user);
        const produto = await this.prisma.produto.findFirst({
            where: {
                id,
                fabrico_id: userFabricoId,
                ...(incluirInativos ? {} : { ativo: true }),
            },
            include: {
                tecido: true,
                fabrico: {
                    select: {
                        fabricacao_sob_demanda: true,
                    },
                },
            },
        });

        if (!produto) {
            throw new NotFoundException("Produto não encontrado");
        }

        return produto;
    }

    async softDelete(id: number, user: AuthenticatedUser) {
        const produto = await this.getById(id, user);

        await this.prisma.produto.update({
            where: { id: produto.id },
            data: { ativo: false, delete_at: new Date() },
        });
        return `O produto com o id ${id} foi desativado com sucesso`;
    }

    async update(id: number, dados: UpdateProduto, user: AuthenticatedUser) {
        const userFabricoId = this.getFabricoId(user);
        this.assertFabricoImutavel(dados.fabrico_id, userFabricoId);

        const produto = await this.getById(id, user);

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

        const { ...dadosUpdate } = dados;

        try {
            const camposQueAlteramCusto: (keyof UpdateProduto)[] = [
                "custo_tecido",
                "quantidade_tecido",
                "tecido_id",
                "custo_operacional",
                "outros_custos",
                "custo_total",
            ];
            const deveRecalcular = camposQueAlteramCusto.some((campo) => campo in dadosUpdate);

            if (deveRecalcular) {
                await this.prisma.$transaction(async (tx) => {
                    await tx.produto.update({
                        where: { id: produto.id },
                        data: { ...dadosUpdate, fabrico_id: produto.fabrico_id },
                    });
                    await this.recalcularCustoTotal(produto.id, tx);
                });
            } else {
                await this.prisma.produto.update({
                    where: { id: produto.id },
                    data: { ...dadosUpdate, fabrico_id: produto.fabrico_id },
                });
            }

            return `O produto com o id ${id} foi atualizado`;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException(
                        "Já existe um produto com este nome para este fabrico",
                    );
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            throw error;
        }
    }

    async getUnassociatedProductsForClient(clienteId: number, user: AuthenticatedUser) {
        const userFabricoId = this.getFabricoId(user);
        return this.prisma.produto.findMany({
            where: {
                fabrico_id: userFabricoId,
                ativo: true,
                cliente_produto: {
                    none: {
                        cliente_id: clienteId,
                    },
                },
            },
            orderBy: { nome: "asc" },
        });
    }
}
