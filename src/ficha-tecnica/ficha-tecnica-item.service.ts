import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFichaTecnicaItemDto } from "./dto/create-ficha-tecnica-item.dto";
import { UpdateFichaTecnicaItemDto } from "./dto/update-ficha-tecnica-item.dto";
import {
    assertMatrizSemMudanca,
    matrizEquivalente,
    MSG_MATRIZ_CONCLUIDA,
    MSG_FICHA_CONCLUIDA,
} from "src/common/utils/ficha";
import {
    lockPedidos,
    sincronizarFinalizacaoPedido,
    assertPedidoNaoFinalizado,
} from "src/pedido/pedido-finalizacao";
import { FichaTecnicaService } from "./ficha-tecnica.service";

@Injectable()
export class FichaTecnicaItemService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly fichaTecnicaService: FichaTecnicaService,
    ) {}

    private validateDuplicados(itens: CreateFichaTecnicaItemDto[]) {
        const chaves = new Set<string>();
        for (const item of itens) {
            const chave = `${item.cor_id}-${item.grade_versao_item_id}`;
            if (chaves.has(chave)) {
                throw new BadRequestException("Existem itens duplicados na mesma ficha técnica");
            }
            chaves.add(chave);
        }
    }

    private async getFichaTecnicaOrFail(ficha_tecnica_id: number, fabrico_id: number) {
        const ficha = await this.prisma.fichaTecnica.findFirst({
            where: { id: Number(ficha_tecnica_id), fabrico_id: fabrico_id },
            select: {
                id: true,
                fabrico_id: true,
                grade_versao_id: true,
                concluida: true,
                pedido_id: true,
            },
        });
        if (!ficha) {
            throw new NotFoundException("Ficha técnica não encontrada");
        }
        return ficha;
    }

    async findAllByFichaTecnicaID(ficha_tecnica_id: number, fabrico_id: number) {
        await this.getFichaTecnicaOrFail(ficha_tecnica_id, fabrico_id);
        try {
            return await this.prisma.fichaTecnicaItem.findMany({
                where: { ficha_tecnica_id: Number(ficha_tecnica_id) },
                include: {
                    cor: true,
                    grade_versao_item: {
                        include: {
                            tamanho: true,
                            grade_versao: true,
                        },
                    },
                },
                orderBy: [{ cor_id: "asc" }, { grade_versao_item: { posicao: "asc" } }],
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async findOne(id: number, fabrico_id: number) {
        try {
            const item = await this.prisma.fichaTecnicaItem.findFirst({
                where: { id, ficha_tecnica: { fabrico_id: fabrico_id } },
                include: {
                    ficha_tecnica: true,
                    cor: true,
                    grade_versao_item: {
                        include: {
                            tamanho: true,
                            grade_versao: true,
                        },
                    },
                },
            });

            if (!item) {
                throw new NotFoundException("Item da ficha técnica não encontrado");
            }

            return item;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async createManyByFichaTecnicaID(
        ficha_tecnica_id: number,
        itens: CreateFichaTecnicaItemDto[],
        fabrico_id: number,
    ) {
        const ficha = await this.getFichaTecnicaOrFail(ficha_tecnica_id, fabrico_id);

        const itensAtuais = await this.prisma.fichaTecnicaItem.findMany({
            where: { ficha_tecnica_id: Number(ficha_tecnica_id) },
            include: {
                cor: true,
                grade_versao_item: { include: { tamanho: true, grade_versao: true } },
            },
            orderBy: [{ cor_id: "asc" }, { grade_versao_item: { posicao: "asc" } }],
        });

        if (ficha.concluida) {
            assertMatrizSemMudanca(ficha, !matrizEquivalente(itensAtuais, itens));
            return { message: "Itens inalterados (eco)", data: itensAtuais };
        }

        if (!itens.length) {
            throw new BadRequestException("Informe ao menos um item para a ficha técnica");
        }

        this.validateDuplicados(itens);

        const corIds = [...new Set(itens.map((item) => Number(item.cor_id)))];
        const gradeVersaoItemIds = [
            ...new Set(itens.map((item) => Number(item.grade_versao_item_id))),
        ];

        const cores = await this.prisma.cor.findMany({
            where: {
                id: { in: corIds },
                fabrico_id: ficha.fabrico_id,
            },
        });

        if (cores.length !== corIds.length) {
            throw new BadRequestException(
                "Uma ou mais cores não pertencem ao fabrico da ficha técnica",
            );
        }

        const gradeVersaoItens = await this.prisma.gradeVersaoItem.findMany({
            where: {
                id: { in: gradeVersaoItemIds },
                grade_versao_id: ficha.grade_versao_id,
            },
        });

        if (gradeVersaoItens.length !== gradeVersaoItemIds.length) {
            throw new BadRequestException(
                "Um ou mais itens de grade não pertencem à versão da ficha técnica",
            );
        }

        try {
            const resultado = await this.prisma.$transaction(async (tx) => {
                await tx.fichaTecnicaItem.deleteMany({
                    where: { ficha_tecnica_id: Number(ficha_tecnica_id) },
                });

                await tx.fichaTecnicaItem.createMany({
                    data: itens.map((item) => ({
                        ficha_tecnica_id: Number(ficha_tecnica_id),
                        cor_id: Number(item.cor_id),
                        grade_versao_item_id: Number(item.grade_versao_item_id),
                        quantidade: Number(item.quantidade),
                    })),
                });

                return tx.fichaTecnicaItem.findMany({
                    where: { ficha_tecnica_id: Number(ficha_tecnica_id) },
                    include: {
                        cor: true,
                        grade_versao_item: {
                            include: {
                                tamanho: true,
                                grade_versao: true,
                            },
                        },
                    },
                    orderBy: [{ cor_id: "asc" }, { grade_versao_item: { posicao: "asc" } }],
                });
            });

            return {
                message: "Itens da ficha técnica salvos com sucesso",
                data: resultado,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException(
                        "Já existe um item com essa combinação na ficha técnica",
                    );
                }
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    async update(id: number, data: UpdateFichaTecnicaItemDto, fabrico_id: number) {
        const atual = await this.findOne(id, fabrico_id);

        if (atual?.ficha_tecnica?.concluida) {
            const mesmaCor = data.cor_id === undefined || Number(data.cor_id) === atual.cor_id;
            const mesmaGrade =
                data.grade_versao_item_id === undefined ||
                Number(data.grade_versao_item_id) === atual.grade_versao_item_id;
            const mesmaQtd =
                data.quantidade === undefined || Number(data.quantidade) === atual.quantidade;

            if (!mesmaCor || !mesmaGrade || !mesmaQtd) {
                throw new ConflictException(MSG_MATRIZ_CONCLUIDA);
            }
            return { message: "Item da ficha técnica atualizado com sucesso (eco)", data: atual };
        }

        if (data.cor_id && data.cor_id !== atual.cor_id) {
            const cor = await this.prisma.cor.findFirst({
                where: { id: Number(data.cor_id), fabrico_id: atual.ficha_tecnica.fabrico_id },
            });
            if (!cor) {
                throw new BadRequestException("A cor não pertence ao fabrico da ficha técnica");
            }
        }

        if (data.grade_versao_item_id && data.grade_versao_item_id !== atual.grade_versao_item_id) {
            const gradeVersaoItem = await this.prisma.gradeVersaoItem.findFirst({
                where: {
                    id: Number(data.grade_versao_item_id),
                    grade_versao_id: atual.ficha_tecnica.grade_versao_id,
                },
            });
            if (!gradeVersaoItem) {
                throw new BadRequestException(
                    "O item de grade não pertence à versão da ficha técnica",
                );
            }
        }

        try {
            const item = await this.prisma.fichaTecnicaItem.update({
                where: { id },
                data: {
                    cor_id: data.cor_id ?? atual.cor_id,
                    grade_versao_item_id: data.grade_versao_item_id ?? atual.grade_versao_item_id,
                    quantidade: data.quantidade ?? atual.quantidade,
                },
                include: {
                    cor: true,
                    grade_versao_item: {
                        include: {
                            tamanho: true,
                            grade_versao: true,
                        },
                    },
                },
            });

            return {
                message: "Item da ficha técnica atualizado com sucesso",
                data: item,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException(
                        "Já existe um item com essa combinação na ficha técnica",
                    );
                }
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    async remove(id: number, fabrico_id: number) {
        const ficha_item = await this.findOne(id, fabrico_id);

        if (ficha_item?.ficha_tecnica?.concluida) {
            if (Number(ficha_item.quantidade) === 0) {
                return {
                    message: "Item da ficha técnica removido com sucesso (eco)",
                    data: ficha_item,
                };
            }
            throw new ConflictException(MSG_MATRIZ_CONCLUIDA);
        }

        try {
            const item = await this.prisma.fichaTecnicaItem.delete({ where: { id } });
            return {
                message: "Item da ficha técnica removido com sucesso",
                data: item,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async clearByFichaTecnicaID(ficha_tecnica_id: number, fabrico_id: number) {
        const ficha = await this.getFichaTecnicaOrFail(ficha_tecnica_id, fabrico_id);

        if (ficha.concluida) {
            const total = await this.prisma.fichaTecnicaItem.count({
                where: { ficha_tecnica_id: ficha.id },
            });

            // Concluída: só passa se não há nada a remover (no-op)
            assertMatrizSemMudanca(ficha, total > 0);
            return { message: "Itens da ficha técnica removidos com sucesso" };
        }

        try {
            await this.prisma.fichaTecnicaItem.deleteMany({
                where: { ficha_tecnica_id: ficha.id },
            });

            return { message: "Itens da ficha técnica removidos com sucesso" };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async gerarItensPorCor(ficha_tecnica_id: number, cor_id: number, fabrico_id: number) {
        const ficha = await this.getFichaTecnicaOrFail(ficha_tecnica_id, fabrico_id);

        const cor = await this.prisma.cor.findFirst({
            where: { id: Number(cor_id), fabrico_id: ficha.fabrico_id },
            select: { id: true },
        });

        if (!cor) {
            throw new BadRequestException("A cor não pertence ao fabrico da ficha técnica");
        }

        const itensGrade = await this.prisma.gradeVersaoItem.findMany({
            where: { grade_versao_id: ficha.grade_versao_id },
            select: { id: true },
            orderBy: { posicao: "asc" },
        });

        if (!itensGrade.length) {
            throw new BadRequestException(
                "A grade da ficha técnica não possui tamanhos configurados",
            );
        }

        const itensExistentes = await this.prisma.fichaTecnicaItem.findMany({
            where: { ficha_tecnica_id: ficha.id, cor_id: cor.id },
            select: { grade_versao_item_id: true },
        });

        const existentesSet = new Set(itensExistentes.map((item) => item.grade_versao_item_id));

        const novosItens = itensGrade
            .filter((item) => !existentesSet.has(item.id))
            .map((item) => ({
                ficha_tecnica_id: ficha.id,
                cor_id: cor.id,
                grade_versao_item_id: item.id,
                quantidade: 0,
            }));

        // Concluída: só passa se não houver nada a criar (no-op)
        assertMatrizSemMudanca(ficha, novosItens.length > 0);

        if (!novosItens.length) {
            return { message: "Essa cor já possui todos os itens da grade nessa ficha técnica" };
        }

        await this.prisma.fichaTecnicaItem.createMany({ data: novosItens });

        return { message: "Itens da cor gerados com sucesso" };
    }

    async gerarItensPorCoresBatch(
        ficha_tecnica_id: number,
        cores_ids: number[],
        fabrico_id: number,
    ) {
        const ficha = await this.getFichaTecnicaOrFail(ficha_tecnica_id, fabrico_id);

        // valida cores pertencentes ao fabrico
        const cores = await this.prisma.cor.findMany({
            where: { id: { in: cores_ids.map(Number) }, fabrico_id: ficha.fabrico_id },
            select: { id: true },
        });

        if (cores.length !== cores_ids.length) {
            throw new BadRequestException(
                "Uma ou mais cores não pertencem ao fabrico da ficha técnica",
            );
        }

        // busca tamanhos da grade
        const itensGrade = await this.prisma.gradeVersaoItem.findMany({
            where: { grade_versao_id: ficha.grade_versao_id },
            select: { id: true },
            orderBy: { posicao: "asc" },
        });

        if (!itensGrade.length) {
            throw new BadRequestException(
                "A grade da ficha técnica não possui tamanhos configurados",
            );
        }

        // evita duplicação (idempotente)
        const existentes = await this.prisma.fichaTecnicaItem.findMany({
            where: { ficha_tecnica_id: ficha.id, cor_id: { in: cores_ids } },
            select: { cor_id: true, grade_versao_item_id: true },
        });

        const existentesSet = new Set(
            existentes.map((e) => `${e.cor_id}-${e.grade_versao_item_id}`),
        );

        const novosItens: {
            ficha_tecnica_id: number;
            cor_id: number;
            grade_versao_item_id: number;
            quantidade: number;
        }[] = [];

        for (const cor of cores) {
            for (const item of itensGrade) {
                if (!existentesSet.has(`${cor.id}-${item.id}`)) {
                    novosItens.push({
                        ficha_tecnica_id: ficha.id,
                        cor_id: cor.id,
                        grade_versao_item_id: item.id,
                        quantidade: 0,
                    });
                }
            }
        }

        // Concluída: só passa se não houver nada a criar (no-op)
        assertMatrizSemMudanca(ficha, novosItens.length > 0);

        if (!novosItens.length) {
            return { message: "Todas as combinações já existem" };
        }

        await this.prisma.fichaTecnicaItem.createMany({ data: novosItens });

        return {
            message: "Matriz de cores x tamanhos criada com sucesso",
            itens_criados: novosItens.length,
        };
    }

    async removerCoresBatch(ficha_tecnica_id: number, cores_ids: number[], fabrico_id: number) {
        const ficha = await this.getFichaTecnicaOrFail(ficha_tecnica_id, fabrico_id);

        // valida se cores pertencem ao fabrico
        const cores = await this.prisma.cor.findMany({
            where: { id: { in: cores_ids.map(Number) }, fabrico_id: ficha.fabrico_id },
            select: { id: true },
        });

        if (cores.length !== cores_ids.length) {
            throw new BadRequestException(
                "Uma ou mais cores não pertencem ao fabrico da ficha técnica",
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const itensExistentes = await tx.fichaTecnicaItem.findMany({
                where: { ficha_tecnica_id: ficha.id, cor_id: { in: cores_ids } },
                select: { id: true },
            });

            // Concluída: só passa se não houver nada a remover (no-op)
            assertMatrizSemMudanca(ficha, itensExistentes.length > 0);

            if (!itensExistentes.length) {
                return {
                    message: "Nenhum item encontrado para as cores informadas",
                    itens_removidos: 0,
                };
            }

            const deleteResult = await tx.fichaTecnicaItem.deleteMany({
                where: { ficha_tecnica_id: ficha.id, cor_id: { in: cores_ids } },
            });

            return {
                message: "Itens das cores removidos com sucesso",
                itens_removidos: deleteResult.count,
            };
        });
    }

    async syncCoresBatch(ficha_tecnica_id: number, cores_ids: number[], fabrico_id: number) {
        const ficha = await this.getFichaTecnicaOrFail(ficha_tecnica_id, fabrico_id);

        const coresUnicas = [...new Set(cores_ids.map(Number))];

        const existentesAntesTx = await this.prisma.fichaTecnicaItem.findMany({
            where: { ficha_tecnica_id: ficha.id },
            select: { cor_id: true },
        });

        const coresAtuaisAntesTx = [...new Set(existentesAntesTx.map((item) => item.cor_id))];
        const coresParaRemoverCheck = coresAtuaisAntesTx.filter(
            (corId) => !coresUnicas.includes(corId),
        );
        const coresParaAdicionarCheck = coresUnicas.filter(
            (corId) => !coresAtuaisAntesTx.includes(corId),
        );

        if (ficha.concluida) {
            if (coresParaRemoverCheck.length > 0 || coresParaAdicionarCheck.length > 0) {
                throw new ConflictException(MSG_MATRIZ_CONCLUIDA);
            }
            return {
                message: "Cores da ficha técnica sincronizadas com sucesso (eco)",
                cores_adicionadas: 0,
                cores_removidas: 0,
            };
        }

        const coresValidas = await this.prisma.cor.findMany({
            where: {
                id: { in: coresUnicas },
                fabrico_id: ficha.fabrico_id,
            },
            select: { id: true },
        });

        if (coresValidas.length !== coresUnicas.length) {
            throw new BadRequestException(
                "Uma ou mais cores não pertencem ao fabrico da ficha técnica",
            );
        }

        const gradeItens = await this.prisma.gradeVersaoItem.findMany({
            where: { grade_versao_id: ficha.grade_versao_id },
            select: { id: true },
            orderBy: { posicao: "asc" },
        });

        if (!gradeItens.length) {
            throw new BadRequestException(
                "A grade da ficha técnica não possui tamanhos configurados",
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const existentes = await tx.fichaTecnicaItem.findMany({
                where: { ficha_tecnica_id: ficha.id },
                select: {
                    cor_id: true,
                    grade_versao_item_id: true,
                },
            });

            const coresAtuais = [...new Set(existentes.map((item) => item.cor_id))];

            const coresParaRemover = coresAtuais.filter((corId) => !coresUnicas.includes(corId));

            const coresParaAdicionar = coresUnicas.filter((corId) => !coresAtuais.includes(corId));

            if (coresParaRemover.length) {
                await tx.fichaTecnicaItem.deleteMany({
                    where: {
                        ficha_tecnica_id: ficha.id,
                        cor_id: { in: coresParaRemover },
                    },
                });
            }

            if (coresParaAdicionar.length) {
                const novosItens = coresParaAdicionar.flatMap((corId) =>
                    gradeItens.map((item) => ({
                        ficha_tecnica_id: ficha.id,
                        cor_id: corId,
                        grade_versao_item_id: item.id,
                        quantidade: 0,
                    })),
                );

                await tx.fichaTecnicaItem.createMany({
                    data: novosItens,
                });
            }

            return {
                message: "Cores da ficha técnica sincronizadas com sucesso",
                cores_adicionadas: coresParaAdicionar.length,
                cores_removidas: coresParaRemover.length,
            };
        });
    }

    async create(ficha_tecnica_id: number, data: CreateFichaTecnicaItemDto, fabrico_id: number) {
        const ficha = await this.getFichaTecnicaOrFail(ficha_tecnica_id, fabrico_id);
        if (ficha.concluida) {
            throw new ConflictException(MSG_MATRIZ_CONCLUIDA);
        }

        const cor = await this.prisma.cor.findFirst({
            where: { id: Number(data.cor_id), fabrico_id: ficha.fabrico_id },
        });
        if (!cor) throw new NotFoundException("Cor não encontrada ou não pertence ao fabrico");

        const gradeVersaoItem = await this.prisma.gradeVersaoItem.findFirst({
            where: {
                id: Number(data.grade_versao_item_id),
                grade_versao_id: ficha.grade_versao_id,
            },
        });
        if (!gradeVersaoItem)
            throw new BadRequestException("O item de grade não pertence à versão da ficha técnica");

        try {
            const item = await this.prisma.fichaTecnicaItem.create({
                data: {
                    ficha_tecnica_id: ficha_tecnica_id,
                    cor_id: Number(data.cor_id),
                    grade_versao_item_id: Number(data.grade_versao_item_id),
                    quantidade: Number(data.quantidade),
                },
            });

            return {
                message: "Item adicionado com sucesso",
                data: item,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Esse item já existe nesta ficha técnica");
                }
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    async replaceMatriz(
        ficha_tecnica_id: number,
        itens: CreateFichaTecnicaItemDto[],
        fabrico_id: number,
    ) {
        this.validateDuplicados(itens);

        const fichaInicial = await this.getFichaTecnicaOrFail(ficha_tecnica_id, fabrico_id);

        try {
            return await this.prisma.$transaction(async (tx) => {
                if (fichaInicial.pedido_id) {
                    await lockPedidos(tx, [fichaInicial.pedido_id]);
                    await assertPedidoNaoFinalizado(tx, fichaInicial.pedido_id);
                }

                await tx.$queryRaw(
                    Prisma.sql`SELECT id FROM "fichas-tecnicas" WHERE id = ${fichaInicial.id} FOR UPDATE`,
                );

                const ficha = await tx.fichaTecnica.findFirst({
                    where: { id: fichaInicial.id, fabrico_id },
                    select: {
                        id: true,
                        fabrico_id: true,
                        pedido_id: true,
                        concluida: true,
                        grade_versao_id: true,
                        defeitos_costura: true,
                        defeitos_tecido: true,
                        retiradas: true,
                        sobras: true,
                    },
                });

                if (!ficha) throw new NotFoundException("Ficha técnica não encontrada");

                if (ficha.pedido_id !== fichaInicial.pedido_id) {
                    throw new ConflictException(
                        "A ficha foi alterada por outra operação, tente novamente",
                    );
                }
                if (ficha.concluida) {
                    throw new ConflictException(MSG_FICHA_CONCLUIDA);
                }

                const corIds = [...new Set(itens.map((i) => Number(i.cor_id)))];
                const gradeItemIds = [...new Set(itens.map((i) => Number(i.grade_versao_item_id)))];

                const cores = await tx.cor.findMany({
                    where: { id: { in: corIds }, fabrico_id: ficha.fabrico_id },
                    select: { id: true },
                });
                if (cores.length !== corIds.length) {
                    throw new BadRequestException(
                        "Uma ou mais cores não pertencem ao fabrico da ficha técnica",
                    );
                }

                const gradeItens = await tx.gradeVersaoItem.findMany({
                    where: { id: { in: gradeItemIds }, grade_versao_id: ficha.grade_versao_id },
                    select: { id: true },
                });
                if (gradeItens.length !== gradeItemIds.length) {
                    throw new BadRequestException(
                        "Um ou mais itens de grade não pertencem à versão da ficha técnica",
                    );
                }

                // 4) substitui a matriz (Atualizar)
                await tx.fichaTecnicaItem.deleteMany({ where: { ficha_tecnica_id: ficha.id } });

                if (itens.length) {
                    await tx.fichaTecnicaItem.createMany({
                        data: itens.map((i) => ({
                            ficha_tecnica_id: ficha.id,
                            cor_id: Number(i.cor_id),
                            grade_versao_item_id: Number(i.grade_versao_item_id),
                            quantidade: Number(i.quantidade),
                        })),
                    });
                }

                // 5) quantidade da ficha
                const quantidade = itens.reduce((t, i) => t + Number(i.quantidade), 0);
                const perdas =
                    (ficha.defeitos_costura ?? 0) +
                    (ficha.defeitos_tecido ?? 0) +
                    (ficha.retiradas ?? 0) +
                    (ficha.sobras ?? 0);

                if (perdas > quantidade) {
                    throw new BadRequestException(
                        "A soma das perdas não pode ser maior que a quantidade da ficha técnica",
                    );
                }

                await tx.fichaTecnica.update({ where: { id: ficha.id }, data: { quantidade } });

                // 6) totais do pedido, na mesma transação
                if (ficha.pedido_id) {
                    await this.fichaTecnicaService.sincronizarPedido(tx, ficha.pedido_id);
                    await sincronizarFinalizacaoPedido(tx, ficha.pedido_id);
                }

                const data = await tx.fichaTecnicaItem.findMany({
                    where: { ficha_tecnica_id: ficha.id },
                    include: {
                        cor: true,
                        grade_versao_item: { include: { tamanho: true, grade_versao: true } },
                    },
                    orderBy: [{ cor_id: "asc" }, { grade_versao_item: { posicao: "asc" } }],
                });

                return { message: "Matriz da ficha técnica salva com sucesso", quantidade, data };
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException(
                        "Já existe um item com essa combinação na ficha técnica",
                    );
                }
                if (error.code === "P2004") {
                    throw new BadRequestException(
                        "A soma das perdas não pode ser maior que a quantidade da ficha técnica",
                    );
                }
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }
}
