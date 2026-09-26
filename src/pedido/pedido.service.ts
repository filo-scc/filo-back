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
                    finalizado: false,
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
     * Multiplica quantidade x valor evitando o erro clássico de ponto flutuante. Descobre a escala decimal do
     * valor, converte para inteiro (arredondando ROUND_HALF_UP) e só então divide
     * de volta, preservando a precisão exata do resultado matemático.
     */
    private multiplicarPreciso(quantidade: number, valor: number): number {
        const valorStr = valor.toString();
        const pontoIndex = valorStr.indexOf(".");
        const casasDecimais = pontoIndex === -1 ? 0 : valorStr.length - pontoIndex - 1;
        const fator = Math.pow(10, casasDecimais);
        const valorInteiro = Math.round(valor * fator);

        return (quantidade * valorInteiro) / fator;
    }

    /**
     * Cria o pedido junto com as fichas técnicas e todos os vínculos derivados
     * (itens da matriz, etapa inicial, parceiros e cliente-produto) em uma única
     * transação: ou tudo é persistido, ou nada é.
     */
    async createCompleto(
        data: CreatePedidoCompletoDto,
        fabricoId: number,
        idempotencyKey?: string,
    ) {
        const key = idempotencyKey?.trim();
        if (!key) {
            throw new BadRequestException("Informe o header Idempotency-Key para criar o pedido");
        }
        const existente = await this.prisma.pedido.findFirst({
            where: { fabrico_id: fabricoId, idempotency_key: key },
            include: { cliente: true, fichas_tecnicas: { include: { fichas_etapas: true } } },
        });

        if (existente?.id) return existente;

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

        if (produtoIds.length !== fichasDto.length) {
            throw new BadRequestException(
                "Não é permitido mais de uma ficha técnica do mesmo produto no pedido",
            );
        }

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
                    // Revalidamos a existência da chave de idempotência já dentro da
                    // transação: protege contra outro request concorrente que grave a
                    // mesma chave entre a checagem inicial e a abertura desta transação.
                    const existenteNaTransacao = await tx.pedido.findFirst({
                        where: { fabrico_id: fabricoId, idempotency_key: key },
                        include: {
                            cliente: true,
                            fichas_tecnicas: { include: { fichas_etapas: true } },
                        },
                    });

                    if (existenteNaTransacao?.id) {
                        return existenteNaTransacao;
                    }

                    // Revalidamos os produtos dentro da transação (fresh snapshot),
                    // evitando condição de corrida com a checagem feita fora dela.
                    const produtosNaTransacao = await tx.produto.findMany({
                        where: { id: { in: produtoIds }, fabrico_id: fabricoId },
                        select: { id: true, grade_versao_id: true },
                    });

                    const gradePorProduto = await this.alinharGradesDosProdutos(
                        tx,
                        fichasDto,
                        produtosNaTransacao,
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

                    const ultimoPedido = await tx.pedido.findFirst({
                        where: { fabrico_id: fabricoId, numero: { not: null } },
                        orderBy: { numero: "desc" },
                        select: { numero: true },
                    });

                    const pedido = await tx.pedido.create({
                        data: {
                            idempotency_key: key,
                            finalizado: false,
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

                        await this.persistirFichaNova(tx, {
                            pedidoId: pedido.id,
                            fabricoId,
                            fichaDto,
                            gradeVersaoId: gradePorProduto.get(produtoId)!,
                            etapaAtualId: etapasPorFicha.get(fichaDto) ?? null,
                            numero: proximoNumeroFicha,
                            clienteId: data.cliente_id,
                        });

                        proximoNumeroFicha += 1;
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
     * Atualiza o pedido e o conjunto de fichas em uma única transação:
     * troca de cliente, inclusão, remoção, edição de matriz/parceiros
     * e ajuste de preço/referência do cliente.
     */
    async updateCompleto(id: number, data: UpdatePedidoCompletoDto, fabricoId: number) {
        const fichasDto = data.fichas ?? [];

        if (!fichasDto.length) {
            throw new BadRequestException("Informe ao menos uma ficha técnica para o pedido");
        }

        const pedido = await this.prisma.pedido.findFirst({
            where: { id, fabrico_id: fabricoId },
            include: { fichas_tecnicas: true },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado!");
        }

        if (pedido.finalizado) {
            throw new ConflictException("Pedido finalizado não pode ser alterado ou excluído");
        }

        if (data.cliente_id) {
            const cliente = await this.prisma.cliente.findFirst({
                where: { id: data.cliente_id, fabrico_id: fabricoId },
            });

            if (!cliente) {
                throw new NotFoundException("Cliente não encontrado!");
            }
        }

        const clienteIdEfetivo =
            data.cliente_id !== undefined ? data.cliente_id : pedido.cliente_id;

        const fichasNovas = fichasDto.filter((ficha) => ficha.id == null);
        const fichasExistentesDto = fichasDto.filter((ficha) => ficha.id != null);
        const idsExistentesPayload = fichasExistentesDto.map((ficha) => Number(ficha.id));

        if (idsExistentesPayload.length !== new Set(idsExistentesPayload).size) {
            throw new BadRequestException("Há fichas técnicas duplicadas no payload");
        }

        const fichasDoPedido = pedido.fichas_tecnicas;
        const mapaFichasPedido = new Map(fichasDoPedido.map((ficha) => [ficha.id, ficha]));

        for (const fichaId of idsExistentesPayload) {
            if (!mapaFichasPedido.has(fichaId)) {
                throw new BadRequestException(
                    "Uma ou mais fichas técnicas não pertencem a este pedido",
                );
            }
        }

        // Duplicidade de produto considerando o resultado final (fichas existentes
        // mantidas + fichas novas), não apenas duplicidade de id.
        const produtoIdsFinais = [
            ...idsExistentesPayload.map((fichaId) => mapaFichasPedido.get(fichaId)!.produto_id),
            ...fichasNovas.map((ficha) => Number(ficha.produto_id)),
        ];

        if (new Set(produtoIdsFinais).size !== produtoIdsFinais.length) {
            throw new BadRequestException("Há fichas técnicas duplicadas no payload");
        }

        for (const fichaDto of fichasExistentesDto) {
            if (
                fichaDto.grade_versao_id &&
                !(Array.isArray(fichaDto.itens) || Array.isArray(fichaDto.cores_ids))
            ) {
                throw new BadRequestException(
                    "Informe os itens ou cores da ficha ao alterar a grade_versao_id",
                );
            }
        }

        const idsParaManter = new Set(idsExistentesPayload);
        const idsParaRemover = fichasDoPedido
            .filter((ficha) => !idsParaManter.has(ficha.id))
            .map((ficha) => ficha.id);

        const produtoIdsNovos = [...new Set(fichasNovas.map((ficha) => Number(ficha.produto_id)))];
        let produtosNovos: { id: number; grade_versao_id: number | null }[] = [];

        if (produtoIdsNovos.length) {
            produtosNovos = await this.prisma.produto.findMany({
                where: { id: { in: produtoIdsNovos }, fabrico_id: fabricoId },
                select: { id: true, grade_versao_id: true },
            });

            if (produtosNovos.length !== produtoIdsNovos.length) {
                throw new NotFoundException("Um ou mais produtos não pertencem a este fabrico");
            }
        }

        try {
            return await this.prisma.$transaction(
                async (tx) => {
                    for (const fichaDto of fichasExistentesDto) {
                        const fichaDb = mapaFichasPedido.get(Number(fichaDto.id))!;

                        if (
                            fichaDto.produto_id !== undefined &&
                            Number(fichaDto.produto_id) !== fichaDb.produto_id
                        ) {
                            throw new BadRequestException(
                                "Não é permitido alterar o produto de uma ficha técnica existente",
                            );
                        }

                        if (Array.isArray(fichaDto.parceiros) && fichaDto.parceiros.length) {
                            const produtoValido = await tx.produto.findFirst({
                                where: { id: fichaDb.produto_id, fabrico_id: fabricoId },
                            });

                            if (!produtoValido) {
                                throw new NotFoundException("Produto não pertence a este fabrico");
                            }
                        }

                        await this.sincronizarPrecosDeParceiros(
                            tx,
                            { ...fichaDto, produto_id: fichaDb.produto_id },
                            fabricoId,
                        );

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

                            const quantidadeDerivada = await this.criarItensDaFicha(
                                tx,
                                fichaDb.id,
                                gradeVersaoId,
                                fabricoId,
                                fichaDto,
                            );

                            if (
                                fichaDto.quantidade !== undefined &&
                                Number(fichaDto.quantidade) !== quantidadeDerivada
                            ) {
                                throw new BadRequestException(
                                    `A quantidade informada (${fichaDto.quantidade}) não corresponde à soma dos itens da matriz (${quantidadeDerivada})`,
                                );
                            }

                            await tx.fichaTecnica.update({
                                where: { id: fichaDb.id },
                                data: {
                                    quantidade: quantidadeDerivada,
                                    grade_versao_id: gradeVersaoId,
                                },
                            });

                            fichaDb.quantidade = quantidadeDerivada;
                            fichaDb.grade_versao_id = gradeVersaoId;
                        } else {
                            // Sem reenvio de matriz: se a quantidade foi informada,
                            // validamos contra a soma real dos itens já persistidos
                            // e só gravamos se ela de fato mudou. Observações são
                            // persistidas independentemente, e etapa_atual_id em
                            // ficha existente é sempre ignorado.
                            const dataFichaUpdate: Record<string, unknown> = {};

                            if (fichaDto.quantidade !== undefined) {
                                const agregando = await tx.fichaTecnicaItem.aggregate({
                                    where: { ficha_tecnica_id: fichaDb.id },
                                    _sum: { quantidade: true },
                                    _count: { _all: true },
                                });

                                const somaAtual = agregando._sum.quantidade ?? 0;

                                if (Number(fichaDto.quantidade) !== somaAtual) {
                                    throw new BadRequestException(
                                        `A quantidade informada (${fichaDto.quantidade}) não corresponde à soma dos itens da matriz (${somaAtual})`,
                                    );
                                }

                                if (Number(fichaDto.quantidade) !== fichaDb.quantidade) {
                                    dataFichaUpdate.quantidade = Number(fichaDto.quantidade);
                                    fichaDb.quantidade = Number(fichaDto.quantidade);
                                }
                            }

                            if (fichaDto.observacoes !== undefined) {
                                dataFichaUpdate.observacoes = fichaDto.observacoes;
                            }

                            if (Object.keys(dataFichaUpdate).length) {
                                await tx.fichaTecnica.update({
                                    where: { id: fichaDb.id },
                                    data: dataFichaUpdate,
                                });
                            }
                        }

                        if (Array.isArray(fichaDto.parceiros)) {
                            await tx.fichaParceiro.deleteMany({
                                where: { ficha_id: fichaDb.id },
                            });
                            await this.vincularParceirosDaFicha(tx, fichaDb.id, fichaDto);
                        }
                    }

                    const etapasPorFicha = fichasNovas.length
                        ? await this.resolverEtapasDasFichas(tx, fichasNovas, fabricoId)
                        : new Map<CreatePedidoFichaDto, number | null>();

                    let produtosNovosNaTransacao = produtosNovos;

                    if (fichasNovas.length && produtoIdsNovos.length) {
                        produtosNovosNaTransacao = await tx.produto.findMany({
                            where: { id: { in: produtoIdsNovos }, fabrico_id: fabricoId },
                            select: { id: true, grade_versao_id: true },
                        });
                    }

                    const gradePorProduto = fichasNovas.length
                        ? await this.alinharGradesDosProdutos(
                              tx,
                              fichasNovas,
                              produtosNovosNaTransacao,
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

                    if (fichasNovas.length) {
                        for (const fichaDto of fichasNovas) {
                            await this.sincronizarPrecosDeParceiros(tx, fichaDto, fabricoId);
                        }

                        const ultimaFicha = await tx.fichaTecnica.findFirst({
                            where: { fabrico_id: fabricoId },
                            orderBy: { numero: "desc" },
                            select: { numero: true },
                        });
                        let proximoNumeroFicha = (ultimaFicha?.numero ?? 0) + 1;

                        for (const fichaDto of fichasNovas) {
                            const produtoId = Number(fichaDto.produto_id);

                            await this.persistirFichaNova(tx, {
                                pedidoId: pedido.id,
                                fabricoId,
                                fichaDto,
                                gradeVersaoId: gradePorProduto.get(produtoId)!,
                                etapaAtualId: etapasPorFicha.get(fichaDto) ?? null,
                                numero: proximoNumeroFicha,
                                clienteId: clienteIdEfetivo,
                            });

                            proximoNumeroFicha += 1;
                        }
                    }

                    const fichasParaTotais: CreatePedidoFichaDto[] = [
                        ...fichasExistentesDto.map((fichaDto) => {
                            const fichaDb = mapaFichasPedido.get(Number(fichaDto.id))!;

                            return {
                                ...fichaDto,
                                produto_id: fichaDb.produto_id,
                                quantidade: fichaDb.quantidade,
                            };
                        }),
                        ...fichasNovas,
                    ];

                    const produtoIdsSemPreco = [
                        ...new Set(
                            fichasParaTotais
                                .filter((ficha) => ficha.preco_padrao === undefined)
                                .map((ficha) => Number(ficha.produto_id)),
                        ),
                    ];

                    let precosPersistidos = new Map<number, number>();

                    if (clienteIdEfetivo && produtoIdsSemPreco.length) {
                        const registros = await tx.clienteProduto.findMany({
                            where: {
                                cliente_id: clienteIdEfetivo,
                                produto_id: { in: produtoIdsSemPreco },
                            },
                            select: { produto_id: true, preco_padrao: true },
                        });

                        precosPersistidos = new Map(
                            registros.map((registro) => [
                                registro.produto_id,
                                Number(registro.preco_padrao ?? 0),
                            ]),
                        );
                    }

                    const fichasComPrecoResolvido = fichasParaTotais.map((ficha) => ({
                        ...ficha,
                        preco_padrao:
                            ficha.preco_padrao !== undefined
                                ? ficha.preco_padrao
                                : (precosPersistidos.get(Number(ficha.produto_id)) ?? 0),
                    }));

                    const produtoIdsTotais = [
                        ...new Set(
                            fichasComPrecoResolvido.map((ficha) => Number(ficha.produto_id)),
                        ),
                    ];

                    const totais = await this.calcularTotais(
                        tx,
                        { cliente_id: clienteIdEfetivo },
                        fichasComPrecoResolvido,
                        produtoIdsTotais,
                    );

                    const dadosPedidoUpdate: Record<string, unknown> = {
                        quantidade: totais.quantidade,
                        valor_total: totais.valor_total,
                        custo_total: totais.custo_total,
                    };

                    if (data.cliente_id !== undefined) {
                        dadosPedidoUpdate.cliente_id = data.cliente_id;
                    }

                    if (data.data_prevista !== undefined) {
                        dadosPedidoUpdate.data_prevista = data.data_prevista
                            ? new Date(data.data_prevista)
                            : null;
                    }

                    if (data.observacoes !== undefined) {
                        dadosPedidoUpdate.observacoes = data.observacoes;
                    }

                    await tx.pedido.update({
                        where: { id: pedido.id },
                        data: dadosPedidoUpdate,
                    });

                    await sincronizarFinalizacaoPedido(tx, pedido.id);

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

            throw new InternalServerErrorException("Erro ao editar o pedido!");
        }
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
                quantidade: 0,
                concluida: false,
                observacoes: params.fichaDto.observacoes,
                numero: params.numero,
            },
        });

        const quantidadeDerivada = await this.criarItensDaFicha(
            tx,
            ficha.id,
            params.gradeVersaoId,
            params.fabricoId,
            params.fichaDto,
        );

        if (
            params.fichaDto.quantidade !== undefined &&
            Number(params.fichaDto.quantidade) !== quantidadeDerivada
        ) {
            throw new BadRequestException(
                `A quantidade informada (${params.fichaDto.quantidade}) não corresponde à soma dos itens da matriz (${quantidadeDerivada})`,
            );
        }

        await tx.fichaTecnica.update({
            where: { id: ficha.id },
            data: { quantidade: quantidadeDerivada },
        });

        if (params.etapaAtualId) {
            await this.registrarEtapaInicial(tx, ficha.id, params.etapaAtualId, params.fabricoId);
        }

        await this.vincularParceirosDaFicha(tx, ficha.id, params.fichaDto);

        if (params.clienteId) {
            await this.vincularClienteProduto(tx, params.clienteId, produtoId, params.fichaDto);
        }

        return { ...ficha, quantidade: quantidadeDerivada };
    }

    /**
     * A ficha técnica herda a grade do produto. Quando o usuário escolhe outra
     * versão durante o cadastro, o produto é atualizado antes das fichas serem criadas.
     * A validação acontece em duas etapas: primeiro se a versão de grade em si é
     * válida/ativa, depois se ela está de fato liberada para este fabrico via
     * FabricoGrade.
     */
    private async alinharGradesDosProdutos(
        tx: Prisma.TransactionClient,
        fichasDto: CreatePedidoFichaDto[],
        produtos: { id: number; grade_versao_id: number | null }[],
        fabricoId: number,
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

            const gradeInfo = await tx.gradeVersao.findFirst({
                where: { id: gradeDesejada, ativo: true },
                select: { id: true, grade_id: true },
            });

            if (!gradeInfo) {
                throw new BadRequestException(
                    "Versão de grade inválida, inativa ou não liberada para este fabrico",
                );
            }

            const fabricoGradeValido = await tx.fabricoGrade.findFirst({
                where: { fabrico_id: fabricoId, grade_id: gradeInfo.grade_id, ativo: true },
                select: { id: true },
            });

            if (!fabricoGradeValido) {
                throw new BadRequestException(
                    "A grade informada não está liberada para este fabrico",
                );
            }

            await tx.produto.update({
                where: { id: produtoId },
                data: { grade_versao_id: gradeDesejada },
            });

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
    private async criarItensDaFicha(
        tx: Prisma.TransactionClient,
        fichaId: number,
        gradeVersaoId: number,
        fabricoId: number,
        fichaDto: CreatePedidoFichaDto,
    ): Promise<number> {
        const itensDto = fichaDto.itens ?? [];
        const quantidadeDeclarada = Number(fichaDto.quantidade) || 0;
        if (itensDto.length === 0) {
            throw new BadRequestException("A matriz de itens não pode ser vazia.");
        }

        const somaMatriz = itensDto.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0);
        if (somaMatriz !== quantidadeDeclarada) {
            throw new BadRequestException(
                `A soma dos itens (${somaMatriz}) difere da quantidade total informada (${quantidadeDeclarada}).`,
            );
        }

        const coresIds = [
            ...new Set([
                ...(fichaDto.cores_ids ?? []).map(Number),
                ...itensDto.map((item) => Number(item.cor_id)),
            ]),
        ];

        if (!coresIds.length) {
            if (quantidadeDeclarada > 0) {
                throw new BadRequestException(
                    "A ficha técnica informa quantidade maior que zero, mas não possui matriz de cores/tamanhos",
                );
            }
            return 0;
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
        return [...quantidadePorChave.values()].reduce((total, q) => total + q, 0);
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
                            ? this.multiplicarPreciso(quantidadeFicha, preco)
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
        // Só inclui no "update" os campos realmente reenviados: quando o campo não
        // foi informado (undefined), preservamos o que já está persistido.
        const updateData: Record<string, unknown> = {};

        if (fichaDto.nome_para_cliente !== undefined) {
            updateData.nome_para_cliente = fichaDto.nome_para_cliente;
        }

        if (fichaDto.preco_padrao !== undefined) {
            updateData.preco_padrao = fichaDto.preco_padrao;
        }

        await tx.clienteProduto.upsert({
            where: { produto_id_cliente_id: { produto_id: produtoId, cliente_id: clienteId } },
            create: {
                produto_id: produtoId,
                cliente_id: clienteId,
                nome_para_cliente: fichaDto.nome_para_cliente ?? "",
                preco_padrao: fichaDto.preco_padrao ?? undefined,
            },
            update: updateData,
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
            produtos.map((produto) => [produto.id, Number(produto.custo_total ?? 0)]),
        );

        const quantidade = fichasDto.reduce(
            (total, ficha) => total + (Number(ficha.quantidade) || 0),
            0,
        );

        const custoTotal = fichasDto.reduce((total, ficha) => {
            const custoUnitario = custoPorProduto.get(Number(ficha.produto_id)) ?? 0;
            return total + this.multiplicarPreciso(Number(ficha.quantidade) || 0, custoUnitario);
        }, 0);

        const valorTotal = data.cliente_id
            ? fichasDto.reduce((total, ficha) => {
                  const preco = Number(ficha.preco_padrao ?? 0);
                  return total + this.multiplicarPreciso(Number(ficha.quantidade) || 0, preco);
              }, 0)
            : null;

        return {
            quantidade,
            custo_total: custoTotal,
            valor_total: valorTotal,
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

        if (pedido.finalizado) {
            throw new BadRequestException("Pedidos finalizados não podem ser deletados.");
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

        if (pedido.finalizado) {
            throw new BadRequestException("Pedido finalizado não pode ser atualizado.");
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
