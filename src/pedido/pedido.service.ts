import {
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from "@nestjs/common";
import { Prisma, Pedido } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { ProdutoService } from "src/produto/produto.service";
import { CreatePedidoDto } from "./dto/create-pedido.dto";
import { CreatePedidoCompletoDto, CreatePedidoFichaDto } from "./dto/create-pedido-completo.dto";
import { UpdatePedidoDto } from "./dto/update-pedido.dto";

const PALETA_13_CORES = [
    "#7FA9B8",
    "#9DB7A5",
    "#5F8F9B",
    "#A89FBF",
    "#8FAF7A",
    "#6E8CA5",
    "#B88772",
    "#8E9CA8",
    "#8D7FA8",
    "#A288C7",
    "#5F9EA0",
    "#B86A7B",
    "#7E8F4E",
];

@Injectable()
export class PedidoService {
    constructor(
        private prisma: PrismaService,
        private readonly produtoService: ProdutoService,
    ) {}

    async create(data: CreatePedidoDto, fabricoId: number): Promise<Pedido> {
        if (data.cliente_id) {
            const clienteExists = await this.prisma.cliente.findFirst({
                where: { id: data.cliente_id, fabrico_id: fabricoId },
            });

            if (!clienteExists) {
                throw new NotFoundException("Cliente não encontrado!");
            }
        }

        const ultimoPedido = await this.prisma.pedido.findFirst({
            where: {
                fabrico_id: fabricoId,
                numero: { not: null },
            },
            orderBy: {
                numero: "desc",
            },
        });

        const numero = (ultimoPedido?.numero ?? 0) + 1;

        const corPedido = data.usarCorPaleta ? await this.getCorPaleta(fabricoId) : "#FFFFFF";

        try {
            return await this.prisma.pedido.create({
                data: {
                    finalizado: data.finalizado ?? false,
                    data_prevista: data.data_prevista ? new Date(data.data_prevista) : null,
                    observacoes: data.observacoes,
                    cliente_id: data.cliente_id,
                    fabrico_id: fabricoId,
                    numero: numero,
                    cor: corPedido,
                    quantidade: data.quantidade,
                    valor_total: data.valor_total,
                    custo_total: data.custo_total,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Já existe um pedido com dados conflitantes!");
            }

            throw new InternalServerErrorException("Erro ao criar o pedido!");
        }
    }

    /**
     * Cria o pedido junto com as fichas técnicas e todos os vínculos derivados
     * (itens da matriz, etapa inicial, parceiros e cliente-produto) em uma única
     * transação: ou tudo é persistido, ou nada é.
     */
    async createCompleto(data: CreatePedidoCompletoDto, fabricoId: number) {
        const fichasDto = data.fichas ?? [];

        if (!fichasDto.length) {
            throw new BadRequestException("Informe ao menos uma ficha técnica para o pedido");
        }

        if (data.cliente_id) {
            const cliente = await this.prisma.cliente.findFirst({
                where: { id: data.cliente_id, fabrico_id: fabricoId },
            });

            if (!cliente) {
                throw new NotFoundException("Cliente não encontrado!");
            }
        }

        const produtoIds = [...new Set(fichasDto.map((ficha) => Number(ficha.produto_id)))];
        const produtos = await this.prisma.produto.findMany({
            where: { id: { in: produtoIds }, fabrico_id: fabricoId },
            select: { id: true, grade_versao_id: true },
        });

        if (produtos.length !== produtoIds.length) {
            throw new NotFoundException("Um ou mais produtos não pertencem a este fabrico");
        }

        try {
            return await this.prisma.$transaction(
                async (tx) => {
                    const gradePorProduto = await this.alinharGradesDosProdutos(
                        tx,
                        fichasDto,
                        produtos,
                    );

                    // Os preços de parceiro alteram o custo_total do produto, então
                    // precisam ser gravados antes de calcular os totais do pedido.
                    for (const fichaDto of fichasDto) {
                        await this.sincronizarPrecosDeParceiros(tx, fichaDto, fabricoId);
                    }

                    const etapasPorFicha = await this.resolverEtapasDasFichas(
                        tx,
                        fichasDto,
                        fabricoId,
                    );

                    const totais = await this.calcularTotais(tx, data, fichasDto, produtoIds);

                    const ultimoPedido = await tx.pedido.findFirst({
                        where: { fabrico_id: fabricoId, numero: { not: null } },
                        orderBy: { numero: "desc" },
                        select: { numero: true },
                    });

                    const pedido = await tx.pedido.create({
                        data: {
                            finalizado: data.finalizado ?? false,
                            data_prevista: data.data_prevista ? new Date(data.data_prevista) : null,
                            observacoes: data.observacoes,
                            cliente_id: data.cliente_id ?? null,
                            fabrico_id: fabricoId,
                            numero: (ultimoPedido?.numero ?? 0) + 1,
                            cor: data.usarCorPaleta
                                ? await this.getCorPaleta(fabricoId, tx)
                                : "#FFFFFF",
                            quantidade: totais.quantidade,
                            valor_total: totais.valor_total,
                            custo_total: totais.custo_total,
                        },
                    });

                    const ultimaFicha = await tx.fichaTecnica.findFirst({
                        where: { fabrico_id: fabricoId },
                        orderBy: { numero: "desc" },
                        select: { numero: true },
                    });
                    let proximoNumeroFicha = (ultimaFicha?.numero ?? 0) + 1;

                    for (const fichaDto of fichasDto) {
                        const produtoId = Number(fichaDto.produto_id);
                        const gradeVersaoId = gradePorProduto.get(produtoId)!;
                        const etapaAtualId = etapasPorFicha.get(fichaDto) ?? null;

                        const ficha = await tx.fichaTecnica.create({
                            data: {
                                pedido_id: pedido.id,
                                produto_id: produtoId,
                                fabrico_id: fabricoId,
                                grade_versao_id: gradeVersaoId,
                                etapa_atual_id: etapaAtualId,
                                quantidade: Number(fichaDto.quantidade) || 0,
                                concluida: false,
                                observacoes: fichaDto.observacoes,
                                numero: proximoNumeroFicha,
                            },
                        });

                        proximoNumeroFicha += 1;

                        await this.criarItensDaFicha(
                            tx,
                            ficha.id,
                            gradeVersaoId,
                            fabricoId,
                            fichaDto,
                        );

                        if (etapaAtualId) {
                            await this.registrarEtapaInicial(tx, ficha.id, etapaAtualId, fabricoId);
                        }

                        await this.vincularParceirosDaFicha(tx, ficha.id, fichaDto);

                        if (data.cliente_id) {
                            await this.vincularClienteProduto(
                                tx,
                                data.cliente_id,
                                produtoId,
                                fichaDto,
                            );
                        }
                    }

                    return tx.pedido.findUnique({
                        where: { id: pedido.id },
                        include: {
                            cliente: true,
                            fichas_tecnicas: { include: { fichas_etapas: true } },
                        },
                    });
                },
                { maxWait: 15000, timeout: 60000 },
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Já existe um pedido com dados conflitantes!");
                }

                if (error.code === "P2003") {
                    throw new BadRequestException("Registro relacionado ao pedido não existe");
                }
            }

            throw new InternalServerErrorException("Erro ao criar o pedido!");
        }
    }

    /**
     * A ficha técnica herda a grade do produto. Quando o usuário escolhe outra
     * versão durante o cadastro, o produto é atualizado antes das fichas serem criadas.
     */
    private async alinharGradesDosProdutos(
        tx: Prisma.TransactionClient,
        fichasDto: CreatePedidoFichaDto[],
        produtos: { id: number; grade_versao_id: number | null }[],
    ): Promise<Map<number, number>> {
        const gradePorProduto = new Map<number, number | null>(
            produtos.map((produto) => [produto.id, produto.grade_versao_id]),
        );

        for (const fichaDto of fichasDto) {
            const produtoId = Number(fichaDto.produto_id);
            const gradeAtual = gradePorProduto.get(produtoId) ?? null;
            const gradeDesejada = fichaDto.grade_versao_id
                ? Number(fichaDto.grade_versao_id)
                : gradeAtual;

            if (!gradeDesejada) {
                throw new BadRequestException("Produto não possui grade definida");
            }

            if (gradeDesejada !== gradeAtual) {
                const gradeValida = await tx.gradeVersao.findFirst({
                    where: { id: gradeDesejada, ativo: true },
                    select: { id: true },
                });

                if (!gradeValida) {
                    throw new BadRequestException("Versão de grade inválida ou inativa");
                }

                await tx.produto.update({
                    where: { id: produtoId },
                    data: { grade_versao_id: gradeDesejada },
                });
            }

            gradePorProduto.set(produtoId, gradeDesejada);
        }

        return gradePorProduto as Map<number, number>;
    }

    private async resolverEtapasDasFichas(
        tx: Prisma.TransactionClient,
        fichasDto: CreatePedidoFichaDto[],
        fabricoId: number,
    ): Promise<Map<CreatePedidoFichaDto, number | null>> {
        const etapaPadrao = await tx.etapa.findFirst({
            where: { fabrico_id: fabricoId, ativa: true },
            orderBy: { ordem: "asc" },
            select: { id: true },
        });

        const etapasInformadas = [
            ...new Set(
                fichasDto
                    .map((ficha) => ficha.etapa_atual_id)
                    .filter((etapaId): etapaId is number => Boolean(etapaId)),
            ),
        ];

        if (etapasInformadas.length) {
            const etapasValidas = await tx.etapa.findMany({
                where: { id: { in: etapasInformadas }, fabrico_id: fabricoId },
                select: { id: true },
            });

            if (etapasValidas.length !== etapasInformadas.length) {
                throw new BadRequestException(
                    "Uma ou mais etapas não pertencem ao fabrico do pedido",
                );
            }
        }

        return new Map(
            fichasDto.map((ficha) => [ficha, ficha.etapa_atual_id ?? etapaPadrao?.id ?? null]),
        );
    }

    /**
     * Reproduz o resultado de sincronizar as cores e salvar a matriz: toda cor
     * selecionada recebe uma linha por tamanho da grade, com quantidade zero
     * quando o usuário não preencheu aquela combinação.
     */
    private async criarItensDaFicha(
        tx: Prisma.TransactionClient,
        fichaId: number,
        gradeVersaoId: number,
        fabricoId: number,
        fichaDto: CreatePedidoFichaDto,
    ) {
        const itensDto = fichaDto.itens ?? [];
        const coresIds = [
            ...new Set([
                ...(fichaDto.cores_ids ?? []).map(Number),
                ...itensDto.map((item) => Number(item.cor_id)),
            ]),
        ];

        if (!coresIds.length) {
            return;
        }

        const coresValidas = await tx.cor.findMany({
            where: { id: { in: coresIds }, fabrico_id: fabricoId },
            select: { id: true },
        });

        if (coresValidas.length !== coresIds.length) {
            throw new BadRequestException(
                "Uma ou mais cores não pertencem ao fabrico da ficha técnica",
            );
        }

        const gradeItens = await tx.gradeVersaoItem.findMany({
            where: { grade_versao_id: gradeVersaoId },
            select: { id: true },
            orderBy: { posicao: "asc" },
        });

        if (!gradeItens.length) {
            throw new BadRequestException(
                "A grade da ficha técnica não possui tamanhos configurados",
            );
        }

        const gradeItensValidos = new Set(gradeItens.map((item) => item.id));
        const quantidadePorChave = new Map<string, number>();

        for (const item of itensDto) {
            const gradeVersaoItemId = Number(item.grade_versao_item_id);

            if (!gradeItensValidos.has(gradeVersaoItemId)) {
                throw new BadRequestException(
                    "Um ou mais itens de grade não pertencem à versão da ficha técnica",
                );
            }

            const chave = `${Number(item.cor_id)}-${gradeVersaoItemId}`;

            if (quantidadePorChave.has(chave)) {
                throw new BadRequestException("Existem itens duplicados na mesma ficha técnica");
            }

            quantidadePorChave.set(chave, Number(item.quantidade) || 0);
        }

        await tx.fichaTecnicaItem.createMany({
            data: coresIds.flatMap((corId) =>
                gradeItens.map((gradeItem) => ({
                    ficha_tecnica_id: fichaId,
                    cor_id: corId,
                    grade_versao_item_id: gradeItem.id,
                    quantidade: quantidadePorChave.get(`${corId}-${gradeItem.id}`) ?? 0,
                })),
            ),
        });
    }

    private async registrarEtapaInicial(
        tx: Prisma.TransactionClient,
        fichaId: number,
        etapaId: number,
        fabricoId: number,
    ) {
        const ultimaEtapa = await tx.etapa.findFirst({
            where: { fabrico_id: fabricoId, ativa: true },
            orderBy: { ordem: "desc" },
            select: { id: true },
        });

        const dataInicio = new Date();

        await tx.fichaEtapa.create({
            data: {
                ficha_tecnica_id: fichaId,
                etapa_id: etapaId,
                data_inicio: dataInicio,
            },
        });

        if (ultimaEtapa?.id === etapaId) {
            await tx.fichaTecnica.updateMany({
                where: { id: fichaId, produzida_em: null },
                data: { produzida_em: dataInicio },
            });
        }
    }

    private async sincronizarPrecosDeParceiros(
        tx: Prisma.TransactionClient,
        fichaDto: CreatePedidoFichaDto,
        fabricoId: number,
    ) {
        const parceiros = fichaDto.parceiros ?? [];

        if (!parceiros.length) {
            return;
        }

        const produtoId = Number(fichaDto.produto_id);
        const parceiroIds = [...new Set(parceiros.map((parceiro) => Number(parceiro.parceiro_id)))];

        const parceirosValidos = await tx.parceiro.findMany({
            where: { id: { in: parceiroIds }, fabrico_id: fabricoId },
            select: { id: true },
        });

        if (parceirosValidos.length !== parceiroIds.length) {
            throw new NotFoundException("Um ou mais parceiros não pertencem a este fabrico");
        }

        await this.produtoService.bloquearProdutosParaRecalculo([produtoId], tx);

        for (const parceiro of parceiros) {
            const preco = parceiro.preco ?? null;
            const parceiroId = Number(parceiro.parceiro_id);

            await tx.parceiroProduto.upsert({
                where: {
                    produto_id_parceiro_id: { produto_id: produtoId, parceiro_id: parceiroId },
                },
                create: { produto_id: produtoId, parceiro_id: parceiroId, preco },
                update: { preco },
            });
        }

        await this.produtoService.recalcularCustoTotal(produtoId, tx);
    }

    private async vincularParceirosDaFicha(
        tx: Prisma.TransactionClient,
        fichaId: number,
        fichaDto: CreatePedidoFichaDto,
    ) {
        const parceiros = fichaDto.parceiros ?? [];

        if (!parceiros.length) {
            return;
        }

        const quantidadeFicha = Number(fichaDto.quantidade) || 0;
        // Só há como atribuir a produção inteira quando existe um único parceiro.
        const parceiroUnico = parceiros.length === 1;

        for (const parceiro of parceiros) {
            const preco = parceiro.preco ?? null;

            await tx.fichaParceiro.create({
                data: {
                    ficha_id: fichaId,
                    parceiro_id: Number(parceiro.parceiro_id),
                    operacao: parceiro.operacao ?? null,
                    quantidade: parceiroUnico ? quantidadeFicha : undefined,
                    valor:
                        parceiroUnico && preco !== null
                            ? Number((quantidadeFicha * preco).toFixed(2))
                            : undefined,
                },
            });
        }
    }

    private async vincularClienteProduto(
        tx: Prisma.TransactionClient,
        clienteId: number,
        produtoId: number,
        fichaDto: CreatePedidoFichaDto,
    ) {
        const nomeParaCliente = fichaDto.nome_para_cliente ?? "";
        const precoPadrao = fichaDto.preco_padrao ?? null;

        await tx.clienteProduto.upsert({
            where: { produto_id_cliente_id: { produto_id: produtoId, cliente_id: clienteId } },
            create: {
                produto_id: produtoId,
                cliente_id: clienteId,
                nome_para_cliente: nomeParaCliente,
                preco_padrao: precoPadrao,
            },
            update: {
                nome_para_cliente: nomeParaCliente,
                preco_padrao: precoPadrao,
            },
        });
    }

    private async calcularTotais(
        tx: Prisma.TransactionClient,
        data: CreatePedidoCompletoDto,
        fichasDto: CreatePedidoFichaDto[],
        produtoIds: number[],
    ) {
        const produtos = await tx.produto.findMany({
            where: { id: { in: produtoIds } },
            select: { id: true, custo_total: true },
        });

        const custoPorProduto = new Map(
            produtos.map((produto) => [produto.id, Number(produto.custo_total ?? 0)]),
        );

        const quantidade = fichasDto.reduce(
            (total, ficha) => total + (Number(ficha.quantidade) || 0),
            0,
        );

        const custoTotal = fichasDto.reduce((total, ficha) => {
            const custoUnitario = custoPorProduto.get(Number(ficha.produto_id)) ?? 0;
            return total + (Number(ficha.quantidade) || 0) * custoUnitario;
        }, 0);

        const valorTotal = data.cliente_id
            ? fichasDto.reduce((total, ficha) => {
                  const preco = Number(ficha.preco_padrao ?? 0);
                  return total + (Number(ficha.quantidade) || 0) * preco;
              }, 0)
            : null;

        return {
            quantidade,
            custo_total: Number(custoTotal.toFixed(2)),
            valor_total: valorTotal === null ? null : Number(valorTotal.toFixed(2)),
        };
    }

    async findAll(fabricoId: number) {
        return this.prisma.pedido.findMany({
            where: { fabrico_id: fabricoId },
            include: {
                cliente: true,
                fichas_tecnicas: {
                    include: { fichas_etapas: true },
                },
            },
        });
    }

    async getById(id: number, fabricoId: number) {
        const pedido = await this.prisma.pedido.findFirst({
            where: { id, fabrico_id: fabricoId },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado!");
        }

        return pedido;
    }

    async delete(id: number, fabricoId: number) {
        const pedido = await this.prisma.pedido.findFirst({
            where: { id, fabrico_id: fabricoId },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado!");
        }

        await this.prisma.pedido.delete({ where: { id: pedido.id } });
        return `O pedido com o id ${id} foi deletado com sucesso`;
    }

    async update(id: number, data: UpdatePedidoDto, fabricoId: number): Promise<Pedido> {
        const pedido = await this.prisma.pedido.findFirst({
            where: { id, fabrico_id: fabricoId },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado!");
        }

        if (data.cliente_id !== undefined && data.cliente_id !== null) {
            const cliente = await this.prisma.cliente.findFirst({
                where: { id: data.cliente_id, fabrico_id: fabricoId },
            });

            if (!cliente) {
                throw new NotFoundException("Cliente não encontrado!");
            }
        }

        return await this.prisma.pedido.update({
            where: { id: pedido.id },
            data: {
                finalizado: data.finalizado,
                data_prevista: data.data_prevista ? new Date(data.data_prevista) : null,
                observacoes: data.observacoes,
                cliente_id: data.cliente_id,
                valor_total: data.valor_total,
                custo_total: data.custo_total,
            },
        });
    }

    async findAllCliente(cliente_id: number, fabricoId: number) {
        return this.prisma.pedido.findMany({
            where: { cliente_id, fabrico_id: fabricoId },
        });
    }

    private async getCorPaleta(
        fabricoId: number,
        db: Prisma.TransactionClient = this.prisma,
    ): Promise<string> {
        const pedidosAtivos = await db.pedido.findMany({
            where: {
                fabrico_id: fabricoId,
                finalizado: false,
                NOT: { cor: { equals: "#FFFFFF", mode: "insensitive" } },
            },
            select: { cor: true },
        });
        const coresEmUso = pedidosAtivos.map((p) => p.cor?.toUpperCase()).filter(Boolean);

        return (
            PALETA_13_CORES.find((c) => !coresEmUso.includes(c.toUpperCase())) ?? PALETA_13_CORES[0]
        );
    }
}
