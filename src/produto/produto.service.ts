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
import { lineTotal, moneyOrZero, sumMoney, toMoney } from "src/common/utils/money";

@Injectable()
export class ProdutoService {
    constructor(private prisma: PrismaService) {}

    private assertFabricoImutavel(fabricoInformado: number | undefined, fabricoId: number) {
        if (fabricoInformado !== undefined && Number(fabricoInformado) !== fabricoId) {
            throw new BadRequestException("Não é permitido alterar o fabrico do produto");
        }
    }

    private getFabricoId(user: AuthenticatedUser): number {
        if (!user?.fabrico_id) {
            throw new BadRequestException("Usuário não possui um fabrico associado");
        }
        return user.fabrico_id;
    }

    private async assertRelacionamentosDoFabrico(
        db: Prisma.TransactionClient,
        dados: {
            tipo_produto_id?: number | null;
            tecido_id?: number | null;
            grade_versao_id?: number | null;
        },
        fabricoId: number,
    ) {
        if (dados.tipo_produto_id === null) {
            throw new BadRequestException("Tipo de produto inválido");
        }

        if (dados.tipo_produto_id !== undefined) {
            const tipoProduto = await db.tipoProduto.findFirst({
                where: { id: dados.tipo_produto_id, fabrico_id: fabricoId },
                select: { id: true },
            });

            if (!tipoProduto) {
                throw new BadRequestException("Tipo de produto inválido");
            }
        }

        if (dados.tecido_id !== undefined && dados.tecido_id !== null) {
            const tecido = await db.tecido.findFirst({
                where: { id: dados.tecido_id, fabrico_id: fabricoId },
                select: { id: true },
            });

            if (!tecido) {
                throw new BadRequestException("Tecido inválido");
            }
        }

        if (dados.grade_versao_id !== undefined && dados.grade_versao_id !== null) {
            await this.assertGradeVersaoLiberadaParaFabrico(db, dados.grade_versao_id, fabricoId);
        }
    }

    private async assertGradeVersaoLiberadaParaFabrico(
        db: Prisma.TransactionClient,
        gradeVersaoId: number,
        fabricoId: number,
    ) {
        // FOR SHARE impede que a liberação, a versão ou a grade sejam desativadas antes do commit.
        // Prisma não emite FOR SHARE; trava versão, grade e liberação até o commit
        // para a validação e a escrita do produto não divergirem sob concorrência.
        const liberacoes = await db.$queryRaw<{ id: number }[]>(
            Prisma.sql`
                SELECT gv."id"
                FROM "grade_versoes" gv
                JOIN "grades" g ON g."id" = gv."grade_id"
                JOIN "fabrico_grades" fg ON fg."grade_id" = gv."grade_id"
                WHERE gv."id" = ${gradeVersaoId}
                  AND gv."ativo" = true
                  AND g."ativo" = true
                  AND fg."fabrico_id" = ${fabricoId}
                  AND fg."ativo" = true
                FOR SHARE OF gv, g, fg
            `,
        );

        if (!liberacoes.length) {
            throw new BadRequestException(
                "Versão de grade inválida ou não liberada para o fabrico",
            );
        }
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

        let custoTecido = new Prisma.Decimal(0);
        if (produto.tecido && produto.quantidade_tecido) {
            custoTecido = lineTotal(produto.quantidade_tecido, produto.tecido.custo_unitario);
        } else if (produto.custo_tecido !== null && produto.custo_tecido !== undefined) {
            custoTecido = moneyOrZero(produto.custo_tecido);
        }

        const etapasAtivas = await db.etapa.findMany({
            where: { fabrico_id: produto.fabrico_id, ativa: true },
            orderBy: { ordem: "asc" },
        });

        const etapasParaCusto = etapasAtivas.slice(0, -1);
        const custoEtapas = etapasParaCusto.reduce((total, etapa) => {
            const precos = produto.parceiro_produto
                .filter((vinculo) => vinculo.parceiro?.etapa_id === etapa.id)
                .map((vinculo) => moneyOrZero(vinculo.preco))
                .filter((preco) => preco.greaterThan(0));

            if (!precos.length) return total;

            const somaPrecos = precos.reduce(
                (soma, preco) => soma.plus(preco),
                new Prisma.Decimal(0),
            );
            return total.plus(toMoney(somaPrecos.dividedBy(precos.length)));
        }, new Prisma.Decimal(0));

        const custoAviamentos = produto.produtoAviamentos.reduce((total, vinculo) => {
            if (vinculo.custo !== null && vinculo.custo !== undefined) {
                return total.plus(moneyOrZero(vinculo.custo));
            }

            // Aviamento guarda custo_unitario com até 3 casas, multiplica e só então arredonda.
            return total.plus(
                toMoney(
                    new Prisma.Decimal(vinculo.quantidade || 0).times(
                        new Prisma.Decimal(vinculo.aviamento?.custo_unitario || 0),
                    ),
                ),
            );
        }, new Prisma.Decimal(0));

        const custoTotal = sumMoney([
            custoTecido,
            custoAviamentos,
            toMoney(custoEtapas),
            moneyOrZero(produto.custo_operacional),
            moneyOrZero(produto.outros_custos),
        ]);

        await db.produto.update({
            where: { id: produtoId },
            data: {
                custo_tecido: custoTecido,
                custo_total: custoTotal,
            },
        });

        return custoTotal.toNumber();
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
        const payload = data as CreateProdutoDto & {
            ativo?: unknown;
            delete_at?: unknown;
        };
        this.assertFabricoImutavel(payload.fabrico_id, userFabricoId);

        const {
            fabrico_id: _fabricoIdIgnorado,
            ativo: _ativoIgnorado,
            delete_at: _deleteAtIgnorado,
            ...dadosCreate
        } = payload;

        try {
            return await this.prisma.$transaction(async (tx) => {
                await this.assertRelacionamentosDoFabrico(tx, dadosCreate, userFabricoId);

                return tx.produto.create({
                    data: {
                        ...dadosCreate,
                        fabrico_id: userFabricoId,
                    },
                });
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw await this.criarConflitoDeNome(dadosCreate.nome, userFabricoId);
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            throw error;
        }
    }

    /**
     * Monta o 409 de nome duplicado. Quando o nome está ocupado por um produto inativo do mesmo
     * fabrico, informa o id para restaurá-lo. A busca é restrita ao fabrico do usuário, então
     * nada é revelado sobre outras fábricas.
     */
    private async criarConflitoDeNome(nome: string | undefined, fabricoId: number) {
        const mensagem = "Já existe um produto com este nome para este fabrico";

        const inativo = nome
            ? await this.prisma.produto.findFirst({
                  where: { fabrico_id: fabricoId, nome, ativo: false },
                  select: { id: true },
              })
            : null;

        if (!inativo) {
            return new ConflictException(mensagem);
        }

        return new ConflictException({
            statusCode: 409,
            error: "Conflict",
            message: `${mensagem}: o produto está inativo e pode ser restaurado`,
            produto_inativo_id: inativo.id,
            restauravel: true,
        });
    }

    async findInativos(user: AuthenticatedUser) {
        const userFabricoId = this.getFabricoId(user);
        return this.prisma.produto.findMany({
            where: {
                fabrico_id: userFabricoId,
                ativo: false,
            },
            select: {
                id: true,
                nome: true,
                foto: true,
                tipo_produto_id: true,
                delete_at: true,
            },
            orderBy: { nome: "asc" },
        });
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

    async findAllFabrico(user: AuthenticatedUser, busca = "") {
        const userFabricoId = this.getFabricoId(user);
        const produtos = await this.prisma.produto.findMany({
            where: {
                fabrico_id: userFabricoId,
                ativo: true,
            },
            include: {
                tecido: true,
            },
            orderBy: { nome: "asc" },
        });

        const buscaNormalizada = this.normalizarTextoBusca(busca);
        if (!buscaNormalizada) return produtos;

        return produtos.filter((produto) =>
            this.normalizarTextoBusca(produto.nome).includes(buscaNormalizada),
        );
    }

    private normalizarTextoBusca(valor: unknown) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("pt-BR")
            .trim();
    }

    private async getByIdWithStatus(id: number, user: AuthenticatedUser, exigirAtivo: boolean) {
        const userFabricoId = this.getFabricoId(user);
        const produto = await this.prisma.produto.findFirst({
            where: {
                id,
                fabrico_id: userFabricoId,
                ...(exigirAtivo ? { ativo: true } : {}),
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

    async getById(id: number, user: AuthenticatedUser) {
        return this.getByIdWithStatus(id, user, false);
    }

    async getActiveById(id: number, user: AuthenticatedUser) {
        return this.getByIdWithStatus(id, user, true);
    }

    async softDelete(id: number, user: AuthenticatedUser) {
        const userFabricoId = this.getFabricoId(user);
        const resultado = await this.prisma.produto.updateMany({
            where: { id, fabrico_id: userFabricoId, ativo: true },
            data: { ativo: false, delete_at: new Date() },
        });

        if (resultado.count === 0) {
            throw new NotFoundException("Produto não encontrado");
        }
        return `O produto com o id ${id} foi desativado com sucesso`;
    }

    async restore(id: number, user: AuthenticatedUser) {
        const userFabricoId = this.getFabricoId(user);
        const resultado = await this.prisma.produto.updateMany({
            where: { id, fabrico_id: userFabricoId, ativo: false },
            data: { ativo: true, delete_at: null },
        });

        if (resultado.count === 0) {
            throw new NotFoundException("Produto não encontrado");
        }

        return `O produto com o id ${id} foi restaurado com sucesso`;
    }

    async update(id: number, dados: UpdateProduto, user: AuthenticatedUser) {
        const userFabricoId = this.getFabricoId(user);
        const payload = dados as UpdateProduto & {
            fabrico_id?: number;
            ativo?: unknown;
            delete_at?: unknown;
        };
        this.assertFabricoImutavel(payload.fabrico_id, userFabricoId);

        const {
            fabrico_id: _fabricoIdIgnorado,
            ativo: _ativoIgnorado,
            delete_at: _deleteAtIgnorado,
            ...dadosUpdate
        } = payload;

        const camposQueAlteramCusto: (keyof UpdateProduto)[] = [
            "custo_tecido",
            "quantidade_tecido",
            "tecido_id",
            "custo_operacional",
            "outros_custos",
            "custo_total",
        ];
        const deveRecalcular = camposQueAlteramCusto.some((campo) => campo in dadosUpdate);

        try {
            await this.prisma.$transaction(async (tx) => {
                const [produto] = await tx.$queryRaw<{ id: number }[]>(
                    Prisma.sql`
                        SELECT "id" FROM "produtos"
                        WHERE "id" = ${id} AND "fabrico_id" = ${userFabricoId} AND "ativo" = true
                        FOR UPDATE
                    `,
                );

                if (!produto) {
                    throw new NotFoundException("Produto não encontrado");
                }

                await this.assertRelacionamentosDoFabrico(tx, dadosUpdate, userFabricoId);

                await tx.produto.update({
                    where: { id: produto.id },
                    data: { ...dadosUpdate, fabrico_id: userFabricoId },
                });

                if (deveRecalcular) {
                    await this.recalcularCustoTotal(produto.id, tx);
                }
            });

            return `O produto com o id ${id} foi atualizado`;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw await this.criarConflitoDeNome(dadosUpdate.nome, userFabricoId);
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            throw error;
        }
    }

    async getUnassociatedProductsForClient(clienteId: number, user: AuthenticatedUser, busca = "") {
        const userFabricoId = this.getFabricoId(user);
        const produtos = await this.prisma.produto.findMany({
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

        const buscaNormalizada = this.normalizarTextoBusca(busca);
        if (!buscaNormalizada) return produtos;

        return produtos.filter((produto) =>
            this.normalizarTextoBusca(produto.nome).includes(buscaNormalizada),
        );
    }
}
