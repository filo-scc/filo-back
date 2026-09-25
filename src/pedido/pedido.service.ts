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
import { UpdatePedidoCompletoDto } from "./dto/update-pedido-completo.dto";
import { UpdatePedidoDto } from "./dto/update-pedido.dto";
import { sincronizarFinalizacaoPedido } from "./pedido-finalizacao";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";
import { lineTotal, moneyOrZero, sumMoney, toMoneyOrNull } from "src/common/utils/money";
import {
    isIdempotencyConflict,
    lockFabricoNumeracao,
    normalizeIdempotencyKey,
    proximoNumeroFicha,
    proximoNumeroPedido,
} from "src/common/utils/concurrency";

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

const PEDIDO_COMPLETO_INCLUDE = {
    cliente: true,
    fichas_tecnicas: { include: { fichas_etapas: true } },
} as const;

@Injectable()
export class PedidoService {
    constructor(
        private prisma: PrismaService,
        private readonly produtoService: ProdutoService,
    ) {}

    async create(data: CreatePedidoDto, user: AuthenticatedUser): Promise<Pedido> {
        const fabricoId = user.fabrico_id!;

        if (data.cliente_id) {
            const clienteExists = await this.prisma.cliente.findFirst({
                where: { id: data.cliente_id, fabrico_id: fabricoId },
            });

            if (!clienteExists) {
                throw new NotFoundException("Cliente não encontrado!");
            }
        }

        const corPedido = data.usarCorPaleta ? await this.getCorPaleta(fabricoId) : "#FFFFFF";

        try {
            return await this.prisma.$transaction(async (tx) => {
                await lockFabricoNumeracao(tx, fabricoId);
                const numero = await proximoNumeroPedido(tx, fabricoId);

                return tx.pedido.create({
                    data: {
                        finalizado: false,
                        data_prevista: data.data_prevista ? new Date(data.data_prevista) : null,
                        observacoes: data.observacoes,
                        cliente_id: data.cliente_id,
                        fabrico_id: fabricoId,
                        numero: numero,
                        cor: corPedido,
                        quantidade: data.quantidade,
                        valor_total:
                            data.valor_total !== undefined
                                ? toMoneyOrNull(data.valor_total)
                                : undefined,
                        custo_total:
                            data.custo_total !== undefined
                                ? toMoneyOrNull(data.custo_total)
                                : undefined,
                    },
                });
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
    async createCompleto(
        data: CreatePedidoCompletoDto,
        user: AuthenticatedUser,
        idempotencyKey?: string,
    ) {
        const fabricoId = user.fabrico_id!;
        const fichasDto = data.fichas ?? [];
        const chaveIdempotencia = normalizeIdempotencyKey(idempotencyKey ?? data.idempotency_key);

        if (!fichasDto.length) {
            throw new BadRequestException("Informe ao menos uma ficha técnica para o pedido");
        }

        // Sem chave, um retry após timeout criaria outro pedido com todas as fichas duplicadas.
        if (!chaveIdempotencia) {
            throw new BadRequestException("Informe o header Idempotency-Key para criar o pedido");
        }

        for (const fichaDto of fichasDto) {
            this.assertSomaItensIgualQuantidade(fichaDto);
        }

        this.assertUmaFichaPorProduto(fichasDto);

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

        if (chaveIdempotencia) {
            const existente = await this.buscarPedidoPorIdempotencia(
                this.prisma,
                fabricoId,
                chaveIdempotencia,
            );

            if (existente) {
                return existente;
            }
        }

        try {
            return await this.prisma.$transaction(
                async (tx) => {
                    await lockFabricoNumeracao(tx, fabricoId);

                    if (chaveIdempotencia) {
                        const existente = await this.buscarPedidoPorIdempotencia(
                            tx,
                            fabricoId,
                            chaveIdempotencia,
                        );

                        if (existente) {
                            return existente;
                        }
                    }

                    const gradePorProduto = await this.alinharGradesDosProdutos(
                        tx,
                        fichasDto,
                        produtos,
                        fabricoId,
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
                    const numeroPedido = await proximoNumeroPedido(tx, fabricoId);

                    const pedido = await tx.pedido.create({
                        data: {
                            finalizado: false,
                            data_prevista: data.data_prevista ? new Date(data.data_prevista) : null,
                            observacoes: data.observacoes,
                            cliente_id: data.cliente_id ?? null,
                            fabrico_id: fabricoId,
                            numero: numeroPedido,
                            cor: data.usarCorPaleta
                                ? await this.getCorPaleta(fabricoId, tx)
                                : "#FFFFFF",
                            quantidade: totais.quantidade,
                            valor_total: totais.valor_total,
                            custo_total: totais.custo_total,
                            ...(chaveIdempotencia ? { idempotency_key: chaveIdempotencia } : {}),
                        },
                    });

                    let numeroFicha = await proximoNumeroFicha(tx, fabricoId);

                    for (const fichaDto of fichasDto) {
                        const produtoId = Number(fichaDto.produto_id);

                        await this.persistirFichaNova(tx, {
                            pedidoId: pedido.id,
                            fabricoId,
                            fichaDto,
                            gradeVersaoId: gradePorProduto.get(produtoId)!,
                            etapaAtualId: etapasPorFicha.get(fichaDto) ?? null,
                            numero: numeroFicha,
                            clienteId: data.cliente_id,
                        });

                        numeroFicha += 1;
                    }

                    return tx.pedido.findUnique({
                        where: { id: pedido.id },
                        include: PEDIDO_COMPLETO_INCLUDE,
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
                    if (chaveIdempotencia && isIdempotencyConflict(error)) {
                        const existente = await this.buscarPedidoPorIdempotencia(
                            this.prisma,
                            fabricoId,
                            chaveIdempotencia,
                        );

                        if (existente) {
                            return existente;
                        }
                    }

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
     * Atualiza o pedido e o conjunto de fichas em uma única transação:
     * troca de cliente, inclusão, remoção, edição de matriz/parceiros
     * e ajuste de preço/referência do cliente.
     */
    async updateCompleto(id: number, data: UpdatePedidoCompletoDto, user: AuthenticatedUser) {
        const fabricoId = user.fabrico_id!;
        const fichasDto = data.fichas ?? [];

        if (!fichasDto.length) {
            throw new BadRequestException("Informe ao menos uma ficha técnica para o pedido");
        }

        for (const fichaDto of fichasDto) {
            const temEdicaoDeMatriz =
                Array.isArray(fichaDto.itens) || Array.isArray(fichaDto.cores_ids);

            if (temEdicaoDeMatriz || fichaDto.id == null) {
                this.assertSomaItensIgualQuantidade(fichaDto);
            }
        }

        const fichasNovasDto = fichasDto.filter((ficha) => ficha.id == null);
        const fichasExistentesDto = fichasDto.filter((ficha) => ficha.id != null);
        const idsExistentesPayload = fichasExistentesDto.map((ficha) => Number(ficha.id));

        if (idsExistentesPayload.length !== new Set(idsExistentesPayload).size) {
            throw new BadRequestException("Há fichas técnicas duplicadas no payload");
        }

        this.assertUmaFichaPorProduto(fichasDto);

        for (const fichaDto of fichasExistentesDto) {
            const temEdicaoDeMatriz =
                Array.isArray(fichaDto.itens) || Array.isArray(fichaDto.cores_ids);

            if (fichaDto.grade_versao_id != null && !temEdicaoDeMatriz) {
                throw new BadRequestException(
                    "Para alterar a grade da ficha, envie também itens ou cores_ids",
                );
            }
        }

        const produtoIdsNovos = [
            ...new Set(fichasNovasDto.map((ficha) => Number(ficha.produto_id))),
        ];

        try {
            return await this.prisma.$transaction(
                async (tx) => {
                    await lockFabricoNumeracao(tx, fabricoId);
                    await this.lockPedidoDoFabrico(tx, id, fabricoId);

                    const pedido = await tx.pedido.findFirst({
                        where: { id, fabrico_id: fabricoId },
                        include: { fichas_tecnicas: true },
                    });

                    if (!pedido) {
                        throw new NotFoundException("Pedido não encontrado!");
                    }

                    this.assertPedidoEditavel(pedido);

                    let produtosNovos: { id: number; grade_versao_id: number | null }[] = [];

                    if (produtoIdsNovos.length) {
                        produtosNovos = await tx.produto.findMany({
                            where: { id: { in: produtoIdsNovos }, fabrico_id: fabricoId },
                            select: { id: true, grade_versao_id: true },
                        });

                        if (produtosNovos.length !== produtoIdsNovos.length) {
                            throw new NotFoundException(
                                "Um ou mais produtos não pertencem a este fabrico",
                            );
                        }
                    }

                    // Omitido = mantém o cliente atual; null explícito = remove o vínculo.
                    const clienteIdEfetivo =
                        data.cliente_id !== undefined ? data.cliente_id : pedido.cliente_id;

                    if (clienteIdEfetivo) {
                        const cliente = await tx.cliente.findFirst({
                            where: { id: clienteIdEfetivo, fabrico_id: fabricoId },
                        });

                        if (!cliente) {
                            throw new NotFoundException("Cliente não encontrado!");
                        }
                    }

                    const fichasNovas = fichasNovasDto;
                    const fichasDoPedido = pedido.fichas_tecnicas;
                    const mapaFichasPedido = new Map(
                        fichasDoPedido.map((ficha) => [ficha.id, ficha]),
                    );

                    for (const fichaId of idsExistentesPayload) {
                        if (!mapaFichasPedido.has(fichaId)) {
                            throw new BadRequestException(
                                "Uma ou mais fichas técnicas não pertencem a este pedido",
                            );
                        }
                    }

                    for (const fichaDto of fichasExistentesDto) {
                        const fichaDb = mapaFichasPedido.get(Number(fichaDto.id))!;

                        if (Number(fichaDto.produto_id) !== fichaDb.produto_id) {
                            throw new BadRequestException(
                                "Não é permitido alterar o produto da ficha",
                            );
                        }
                    }

                    // Garante que helpers downstream nunca usem produto_id divergente do banco.
                    const fichasExistentesNormalizadas = fichasExistentesDto.map((fichaDto) => {
                        const fichaDb = mapaFichasPedido.get(Number(fichaDto.id))!;
                        return { ...fichaDto, produto_id: fichaDb.produto_id };
                    });

                    const idsParaManter = new Set(idsExistentesPayload);
                    const idsParaRemover = fichasDoPedido
                        .filter((ficha) => !idsParaManter.has(ficha.id))
                        .map((ficha) => ficha.id);

                    for (const fichaDto of fichasExistentesNormalizadas) {
                        await this.sincronizarPrecosDeParceiros(tx, fichaDto, fabricoId);
                    }

                    const etapasPorFicha = fichasNovas.length
                        ? await this.resolverEtapasDasFichas(tx, fichasNovas, fabricoId)
                        : new Map<CreatePedidoFichaDto, number | null>();

                    const gradePorProduto = fichasNovas.length
                        ? await this.alinharGradesDosProdutos(
                              tx,
                              fichasNovas,
                              produtosNovos,
                              fabricoId,
                          )
                        : new Map<number, number>();

                    if (idsParaRemover.length) {
                        await tx.fichaEtapa.deleteMany({
                            where: { ficha_tecnica_id: { in: idsParaRemover } },
                        });
                        await tx.fichaTecnica.deleteMany({
                            where: { id: { in: idsParaRemover }, pedido_id: pedido.id },
                        });
                    }

                    for (const fichaDto of fichasExistentesNormalizadas) {
                        const fichaDb = mapaFichasPedido.get(Number(fichaDto.id))!;

                        if (clienteIdEfetivo) {
                            await this.vincularClienteProduto(
                                tx,
                                clienteIdEfetivo,
                                fichaDb.produto_id,
                                fichaDto,
                            );
                        }

                        const temEdicaoDeMatriz =
                            Array.isArray(fichaDto.itens) || Array.isArray(fichaDto.cores_ids);
                        const novaQuantidade = Number(fichaDto.quantidade) || 0;
                        const updateData: {
                            quantidade?: number;
                            grade_versao_id?: number;
                            observacoes?: string;
                        } = {};

                        if (novaQuantidade !== fichaDb.quantidade) {
                            updateData.quantidade = novaQuantidade;
                        }

                        if (fichaDto.observacoes !== undefined) {
                            updateData.observacoes = fichaDto.observacoes;
                        }

                        if (temEdicaoDeMatriz) {
                            let gradeVersaoId = fichaDb.grade_versao_id;

                            if (fichaDto.grade_versao_id) {
                                const gradeMap = await this.alinharGradesDosProdutos(
                                    tx,
                                    [fichaDto],
                                    [
                                        {
                                            id: fichaDb.produto_id,
                                            grade_versao_id: fichaDb.grade_versao_id,
                                        },
                                    ],
                                    fabricoId,
                                );
                                gradeVersaoId = gradeMap.get(fichaDb.produto_id)!;
                            }

                            await tx.fichaTecnicaItem.deleteMany({
                                where: { ficha_tecnica_id: fichaDb.id },
                            });

                            await this.criarItensDaFicha(
                                tx,
                                fichaDb.id,
                                gradeVersaoId,
                                fabricoId,
                                fichaDto,
                            );

                            updateData.quantidade = novaQuantidade;
                            updateData.grade_versao_id = gradeVersaoId;
                            fichaDb.grade_versao_id = gradeVersaoId;
                        } else {
                            await this.assertMatrizPersistidaCompativel(
                                tx,
                                fichaDb.id,
                                novaQuantidade,
                            );
                        }

                        if (Object.keys(updateData).length) {
                            await tx.fichaTecnica.update({
                                where: { id: fichaDb.id },
                                data: updateData,
                            });

                            if (updateData.quantidade !== undefined) {
                                fichaDb.quantidade = updateData.quantidade;
                            }
                        }

                        if (Array.isArray(fichaDto.parceiros)) {
                            await tx.fichaParceiro.deleteMany({
                                where: { ficha_id: fichaDb.id },
                            });
                            await this.vincularParceirosDaFicha(tx, fichaDb.id, fichaDto);
                        }
                    }

                    if (fichasNovas.length) {
                        for (const fichaDto of fichasNovas) {
                            await this.sincronizarPrecosDeParceiros(tx, fichaDto, fabricoId);
                        }

                        const numeroInicialFicha = await proximoNumeroFicha(tx, fabricoId);
                        let numeroFicha = numeroInicialFicha;

                        for (const fichaDto of fichasNovas) {
                            const produtoId = Number(fichaDto.produto_id);

                            await this.persistirFichaNova(tx, {
                                pedidoId: pedido.id,
                                fabricoId,
                                fichaDto,
                                gradeVersaoId: gradePorProduto.get(produtoId)!,
                                etapaAtualId: etapasPorFicha.get(fichaDto) ?? null,
                                numero: numeroFicha,
                                clienteId: clienteIdEfetivo,
                            });

                            numeroFicha += 1;
                        }
                    }

                    const fichasParaTotais: CreatePedidoFichaDto[] = [
                        ...fichasExistentesNormalizadas.map((fichaDto) => {
                            const fichaDb = mapaFichasPedido.get(Number(fichaDto.id))!;

                            return {
                                ...fichaDto,
                                produto_id: fichaDb.produto_id,
                                quantidade: fichaDb.quantidade,
                            };
                        }),
                        ...fichasNovas,
                    ];

                    const produtoIdsTotais = [
                        ...new Set(fichasParaTotais.map((ficha) => Number(ficha.produto_id))),
                    ];
                    const totais = await this.calcularTotais(
                        tx,
                        { cliente_id: clienteIdEfetivo },
                        fichasParaTotais,
                        produtoIdsTotais,
                    );

                    await tx.pedido.update({
                        where: { id: pedido.id },
                        data: {
                            ...(data.cliente_id !== undefined
                                ? { cliente_id: data.cliente_id }
                                : {}),
                            ...(data.data_prevista !== undefined
                                ? {
                                      data_prevista: data.data_prevista
                                          ? new Date(data.data_prevista)
                                          : null,
                                  }
                                : {}),
                            ...(data.observacoes !== undefined
                                ? { observacoes: data.observacoes }
                                : {}),
                            quantidade: totais.quantidade,
                            valor_total: totais.valor_total,
                            custo_total: totais.custo_total,
                        },
                    });

                    // finalizado acompanha as fichas (ex.: nova FT pendente reabre o pedido).
                    await sincronizarFinalizacaoPedido(tx, pedido.id);

                    return tx.pedido.findUnique({
                        where: { id: pedido.id },
                        include: PEDIDO_COMPLETO_INCLUDE,
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

            throw new InternalServerErrorException("Erro ao editar o pedido!");
        }
    }

    // Um pedido tem no máximo uma ficha por produto; grade e preço são resolvidos por produto.
    private assertUmaFichaPorProduto(fichasDto: CreatePedidoFichaDto[]) {
        const produtoIds = fichasDto.map((ficha) => Number(ficha.produto_id));

        if (produtoIds.length !== new Set(produtoIds).size) {
            throw new BadRequestException(
                "Não é permitido mais de uma ficha técnica do mesmo produto no pedido",
            );
        }
    }

    private assertPedidoEditavel(pedido: { finalizado: boolean }) {
        if (pedido.finalizado) {
            throw new ConflictException("Pedido finalizado não pode ser alterado ou excluído");
        }
    }

    private async lockPedidoDoFabrico(
        tx: Prisma.TransactionClient,
        pedidoId: number,
        fabricoId: number,
    ) {
        const locked = await tx.$queryRaw<{ id: number }[]>(
            Prisma.sql`SELECT id FROM "pedidos" WHERE id = ${pedidoId} AND fabrico_id = ${fabricoId} FOR UPDATE`,
        );

        if (!locked.length) {
            throw new NotFoundException("Pedido não encontrado!");
        }
    }

    private buscarPedidoPorIdempotencia(
        db: Prisma.TransactionClient | PrismaService,
        fabricoId: number,
        chaveIdempotencia: string,
    ) {
        return db.pedido.findFirst({
            where: { fabrico_id: fabricoId, idempotency_key: chaveIdempotencia },
            include: PEDIDO_COMPLETO_INCLUDE,
        });
    }

    private async persistirFichaNova(
        tx: Prisma.TransactionClient,
        params: {
            pedidoId: number;
            fabricoId: number;
            fichaDto: CreatePedidoFichaDto;
            gradeVersaoId: number;
            etapaAtualId: number | null;
            numero: number;
            clienteId?: number | null;
        },
    ) {
        const produtoId = Number(params.fichaDto.produto_id);

        const ficha = await tx.fichaTecnica.create({
            data: {
                pedido_id: params.pedidoId,
                produto_id: produtoId,
                fabrico_id: params.fabricoId,
                grade_versao_id: params.gradeVersaoId,
                etapa_atual_id: params.etapaAtualId,
                quantidade: Number(params.fichaDto.quantidade) || 0,
                concluida: false,
                observacoes: params.fichaDto.observacoes,
                numero: params.numero,
            },
        });

        await this.criarItensDaFicha(
            tx,
            ficha.id,
            params.gradeVersaoId,
            params.fabricoId,
            params.fichaDto,
        );

        if (params.etapaAtualId) {
            await this.registrarEtapaInicial(tx, ficha.id, params.etapaAtualId, params.fabricoId);
        }

        await this.vincularParceirosDaFicha(tx, ficha.id, params.fichaDto);

        if (params.clienteId) {
            await this.vincularClienteProduto(tx, params.clienteId, produtoId, params.fichaDto);
        }

        return ficha;
    }

    /**
     * A ficha técnica herda a grade do produto. Quando o usuário escolhe outra
     * versão durante o cadastro, o produto é atualizado antes das fichas serem criadas.
     */
    private async alinharGradesDosProdutos(
        tx: Prisma.TransactionClient,
        fichasDto: CreatePedidoFichaDto[],
        produtos: { id: number; grade_versao_id: number | null }[],
        fabricoId: number,
    ): Promise<Map<number, number>> {
        const produtoIds = [...new Set(fichasDto.map((ficha) => Number(ficha.produto_id)))];
        const produtosDoFabrico = await tx.produto.findMany({
            where: { id: { in: produtoIds }, fabrico_id: fabricoId },
            select: { id: true },
        });

        if (produtosDoFabrico.length !== produtoIds.length) {
            throw new NotFoundException("Um ou mais produtos não pertencem a este fabrico");
        }

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

            await this.assertGradeVersaoLiberadaParaFabrico(tx, gradeDesejada, fabricoId);

            if (gradeDesejada !== gradeAtual) {
                const atualizados = await tx.produto.updateMany({
                    where: { id: produtoId, fabrico_id: fabricoId },
                    data: { grade_versao_id: gradeDesejada },
                });

                if (atualizados.count === 0) {
                    throw new NotFoundException("Um ou mais produtos não pertencem a este fabrico");
                }
            }

            gradePorProduto.set(produtoId, gradeDesejada);
        }

        return gradePorProduto as Map<number, number>;
    }

    private async assertGradeVersaoLiberadaParaFabrico(
        tx: Prisma.TransactionClient,
        gradeVersaoId: number,
        fabricoId: number,
    ) {
        const gradeVersao = await tx.gradeVersao.findFirst({
            where: { id: gradeVersaoId, ativo: true },
            select: { id: true, grade_id: true },
        });

        if (!gradeVersao) {
            throw new BadRequestException("Versão de grade inválida ou inativa");
        }

        const liberacao = await tx.fabricoGrade.findFirst({
            where: {
                fabrico_id: fabricoId,
                grade_id: gradeVersao.grade_id,
                ativo: true,
            },
            select: { id: true },
        });

        if (!liberacao) {
            throw new BadRequestException("A grade informada não está liberada para este fabrico");
        }
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
                where: { id: { in: etapasInformadas }, fabrico_id: fabricoId, ativa: true },
                select: { id: true },
            });

            if (etapasValidas.length !== etapasInformadas.length) {
                throw new BadRequestException(
                    "Uma ou mais etapas não pertencem ao fabrico do pedido ou estão inativas",
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
    private assertSomaItensIgualQuantidade(fichaDto: CreatePedidoFichaDto) {
        const quantidade = Number(fichaDto.quantidade) || 0;
        const itensDto = fichaDto.itens ?? [];
        const temMatriz = Array.isArray(fichaDto.itens) || Array.isArray(fichaDto.cores_ids);

        if (quantidade > 0 && !temMatriz) {
            throw new BadRequestException(
                "Informe a matriz (itens ou cores_ids) quando a quantidade da ficha for positiva",
            );
        }

        if (!temMatriz) {
            return;
        }

        const somaItens = itensDto.reduce(
            (total, item) => total + (Number(item.quantidade) || 0),
            0,
        );

        if (somaItens !== quantidade) {
            throw new BadRequestException(
                "A soma das quantidades da matriz deve ser igual à quantidade da ficha técnica",
            );
        }
    }

    private async assertMatrizPersistidaCompativel(
        tx: Prisma.TransactionClient,
        fichaId: number,
        quantidade: number,
    ) {
        const agregado = await tx.fichaTecnicaItem.aggregate({
            where: { ficha_tecnica_id: fichaId },
            _sum: { quantidade: true },
            _count: { _all: true },
        });

        const soma = Number(agregado._sum.quantidade ?? 0);
        const totalItens = agregado._count._all;

        if (quantidade > 0 && totalItens === 0) {
            throw new BadRequestException(
                "A ficha com quantidade positiva precisa ter matriz de itens",
            );
        }

        if (soma !== quantidade) {
            throw new BadRequestException(
                "A soma das quantidades da matriz deve ser igual à quantidade da ficha técnica",
            );
        }
    }

    private async criarItensDaFicha(
        tx: Prisma.TransactionClient,
        fichaId: number,
        gradeVersaoId: number,
        fabricoId: number,
        fichaDto: CreatePedidoFichaDto,
    ) {
        this.assertSomaItensIgualQuantidade(fichaDto);

        const itensDto = fichaDto.itens ?? [];
        const coresIds = [
            ...new Set([
                ...(fichaDto.cores_ids ?? []).map(Number),
                ...itensDto.map((item) => Number(item.cor_id)),
            ]),
        ];
        const quantidade = Number(fichaDto.quantidade) || 0;

        if (!coresIds.length) {
            if (quantidade > 0) {
                throw new BadRequestException(
                    "Informe a matriz (itens ou cores_ids) quando a quantidade da ficha for positiva",
                );
            }
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

        const somaMatriz = [...quantidadePorChave.values()].reduce(
            (total, valor) => total + valor,
            0,
        );

        if (somaMatriz !== quantidade) {
            throw new BadRequestException(
                "A soma das quantidades da matriz deve ser igual à quantidade da ficha técnica",
            );
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

        const produto = await tx.produto.findFirst({
            where: { id: produtoId, fabrico_id: fabricoId },
            select: { id: true },
        });

        if (!produto) {
            throw new NotFoundException("Um ou mais produtos não pertencem a este fabrico");
        }

        const parceirosValidos = await tx.parceiro.findMany({
            where: { id: { in: parceiroIds }, fabrico_id: fabricoId },
            select: { id: true },
        });

        if (parceirosValidos.length !== parceiroIds.length) {
            throw new NotFoundException("Um ou mais parceiros não pertencem a este fabrico");
        }

        await this.produtoService.bloquearProdutosParaRecalculo([produtoId], tx);

        for (const parceiro of parceiros) {
            const preco = toMoneyOrNull(parceiro.preco);
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
            const preco = toMoneyOrNull(parceiro.preco);

            await tx.fichaParceiro.create({
                data: {
                    ficha_id: fichaId,
                    parceiro_id: Number(parceiro.parceiro_id),
                    operacao: parceiro.operacao ?? null,
                    quantidade: parceiroUnico ? quantidadeFicha : undefined,
                    valor:
                        parceiroUnico && preco !== null
                            ? lineTotal(quantidadeFicha, preco)
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
        const nomeInformado = fichaDto.nome_para_cliente !== undefined;
        const precoInformado = fichaDto.preco_padrao !== undefined;
        const nomeParaCliente = nomeInformado ? (fichaDto.nome_para_cliente ?? "") : "";
        const precoPadrao = precoInformado ? toMoneyOrNull(fichaDto.preco_padrao) : null;

        // Omitir o campo no payload = manter o valor já persistido.
        // null explícito em preco_padrao = limpar o preço cadastrado.
        const update: { nome_para_cliente?: string; preco_padrao?: Prisma.Decimal | null } = {};

        if (nomeInformado) {
            update.nome_para_cliente = nomeParaCliente;
        }

        if (precoInformado) {
            update.preco_padrao = precoPadrao;
        }

        await tx.clienteProduto.upsert({
            where: { produto_id_cliente_id: { produto_id: produtoId, cliente_id: clienteId } },
            create: {
                produto_id: produtoId,
                cliente_id: clienteId,
                nome_para_cliente: nomeParaCliente,
                preco_padrao: precoPadrao,
            },
            update,
        });
    }

    private async calcularTotais(
        tx: Prisma.TransactionClient,
        data: { cliente_id?: number | null },
        fichasDto: CreatePedidoFichaDto[],
        produtoIds: number[],
    ) {
        const produtos = await tx.produto.findMany({
            where: { id: { in: produtoIds } },
            select: { id: true, custo_total: true },
        });

        const custoPorProduto = new Map(
            produtos.map((produto) => [produto.id, moneyOrZero(produto.custo_total)]),
        );

        const quantidade = fichasDto.reduce(
            (total, ficha) => total + (Number(ficha.quantidade) || 0),
            0,
        );

        const custoTotal = sumMoney(
            fichasDto.map((ficha) => {
                const custoUnitario = custoPorProduto.get(Number(ficha.produto_id));
                return lineTotal(Number(ficha.quantidade) || 0, custoUnitario);
            }),
        );

        const valorTotal = data.cliente_id
            ? await this.calcularValorTotalDoCliente(tx, data.cliente_id, fichasDto)
            : null;

        return {
            quantidade,
            custo_total: custoTotal,
            valor_total: valorTotal,
        };
    }

    /**
     * Usa o preco_padrao do payload quando informado (inclusive null explícito).
     * Quando omitido, recupera o preço já cadastrado em ClienteProduto.
     */
    private async calcularValorTotalDoCliente(
        tx: Prisma.TransactionClient,
        clienteId: number,
        fichasDto: CreatePedidoFichaDto[],
    ) {
        const produtosSemPrecoNoPayload = [
            ...new Set(
                fichasDto
                    .filter((ficha) => ficha.preco_padrao === undefined)
                    .map((ficha) => Number(ficha.produto_id)),
            ),
        ];

        const precoPersistidoPorProduto = new Map<number, Prisma.Decimal | null>();

        if (produtosSemPrecoNoPayload.length) {
            const registros = await tx.clienteProduto.findMany({
                where: {
                    cliente_id: clienteId,
                    produto_id: { in: produtosSemPrecoNoPayload },
                },
                select: { produto_id: true, preco_padrao: true },
            });

            for (const registro of registros) {
                precoPersistidoPorProduto.set(
                    registro.produto_id,
                    registro.preco_padrao !== null && registro.preco_padrao !== undefined
                        ? moneyOrZero(registro.preco_padrao)
                        : null,
                );
            }
        }

        return sumMoney(
            fichasDto.map((ficha) => {
                const produtoId = Number(ficha.produto_id);
                const precoUnitario =
                    ficha.preco_padrao !== undefined
                        ? ficha.preco_padrao
                        : precoPersistidoPorProduto.get(produtoId);

                return lineTotal(Number(ficha.quantidade) || 0, precoUnitario);
            }),
        );
    }

    async findAll(user: AuthenticatedUser) {
        const fabricoId = user.fabrico_id!;

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

    async getById(id: number, user: AuthenticatedUser) {
        const fabricoId = user.fabrico_id!;

        const pedido = await this.prisma.pedido.findFirst({
            where: { id, fabrico_id: fabricoId },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado!");
        }

        return pedido;
    }

    async delete(id: number, user: AuthenticatedUser) {
        const fabricoId = user.fabrico_id!;

        const pedido = await this.prisma.pedido.findFirst({
            where: { id, fabrico_id: fabricoId },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado!");
        }

        this.assertPedidoEditavel(pedido);

        await this.prisma.pedido.delete({ where: { id: pedido.id } });
        return `O pedido com o id ${id} foi deletado com sucesso`;
    }

    async update(id: number, data: UpdatePedidoDto, user: AuthenticatedUser): Promise<Pedido> {
        const fabricoId = user.fabrico_id!;

        const pedido = await this.prisma.pedido.findFirst({
            where: { id, fabrico_id: fabricoId },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado!");
        }

        this.assertPedidoEditavel(pedido);

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
                data_prevista: data.data_prevista ? new Date(data.data_prevista) : null,
                observacoes: data.observacoes,
                cliente_id: data.cliente_id,
                valor_total:
                    data.valor_total !== undefined ? toMoneyOrNull(data.valor_total) : undefined,
                custo_total:
                    data.custo_total !== undefined ? toMoneyOrNull(data.custo_total) : undefined,
            },
        });
    }

    async findAllCliente(cliente_id: number, user: AuthenticatedUser) {
        const fabricoId = user.fabrico_id!;

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
