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

@Injectable()
export class FichaTecnicaItemService {
    constructor(private readonly prisma: PrismaService) {}

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

    async findAllByFichaTecnicaID(ficha_tecnica_id: number) {
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

    async findOne(id: number) {
        try {
            const item = await this.prisma.fichaTecnicaItem.findUnique({
                where: { id },
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

    async createManyByFichaTecnicaID(ficha_tecnica_id: number, itens: CreateFichaTecnicaItemDto[]) {
        const ficha = await this.prisma.fichaTecnica.findUnique({
            where: { id: Number(ficha_tecnica_id) },
            include: {
                produto: true,
                grade_versao: true,
            },
        });

        if (!ficha) {
            throw new NotFoundException("Ficha técnica não encontrada");
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

    async update(id: number, data: UpdateFichaTecnicaItemDto) {
        const atual = await this.findOne(id);

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

    async remove(id: number) {
        await this.findOne(id);

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

    async clearByFichaTecnicaID(ficha_tecnica_id: number) {
        try {
            await this.prisma.fichaTecnicaItem.deleteMany({
                where: { ficha_tecnica_id: Number(ficha_tecnica_id) },
            });

            return { message: "Itens da ficha técnica removidos com sucesso" };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async gerarItensPorCor(ficha_tecnica_id: number, cor_id: number) {
        const ficha = await this.prisma.fichaTecnica.findUnique({
            where: { id: Number(ficha_tecnica_id) },
            select: {
                id: true,
                fabrico_id: true,
                grade_versao_id: true,
            },
        });

        if (!ficha) {
            throw new NotFoundException("Ficha técnica não encontrada");
        }

        const cor = await this.prisma.cor.findFirst({
            where: {
                id: Number(cor_id),
                fabrico_id: ficha.fabrico_id,
            },
            select: {
                id: true,
            },
        });

        if (!cor) {
            throw new BadRequestException("A cor não pertence ao fabrico da ficha técnica");
        }

        const itensGrade = await this.prisma.gradeVersaoItem.findMany({
            where: {
                grade_versao_id: ficha.grade_versao_id,
            },
            select: {
                id: true,
            },
            orderBy: {
                posicao: "asc",
            },
        });

        if (!itensGrade.length) {
            throw new BadRequestException(
                "A grade da ficha técnica não possui tamanhos configurados",
            );
        }

        const itensExistentes = await this.prisma.fichaTecnicaItem.findMany({
            where: {
                ficha_tecnica_id: ficha.id,
                cor_id: cor.id,
            },
            select: {
                grade_versao_item_id: true,
            },
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

        if (!novosItens.length) {
            return {
                message: "Essa cor já possui todos os itens da grade nessa ficha técnica",
            };
        }

        await this.prisma.fichaTecnicaItem.createMany({
            data: novosItens,
        });

        return {
            message: "Itens da cor gerados com sucesso",
        };
    }

    async gerarItensPorCoresBatch(ficha_tecnica_id: number, cores_ids: number[]) {
        const ficha = await this.prisma.fichaTecnica.findUnique({
            where: { id: Number(ficha_tecnica_id) },
            select: {
                id: true,
                fabrico_id: true,
                grade_versao_id: true,
            },
        });

        if (!ficha) {
            throw new NotFoundException("Ficha técnica não encontrada");
        }

        // valida cores pertencentes ao fabrico
        const cores = await this.prisma.cor.findMany({
            where: {
                id: { in: cores_ids.map(Number) },
                fabrico_id: ficha.fabrico_id,
            },
            select: { id: true },
        });

        if (cores.length !== cores_ids.length) {
            throw new BadRequestException(
                "Uma ou mais cores não pertencem ao fabrico da ficha técnica",
            );
        }

        // busca tamanhos da grade
        const itensGrade = await this.prisma.gradeVersaoItem.findMany({
            where: {
                grade_versao_id: ficha.grade_versao_id,
            },
            select: {
                id: true,
            },
            orderBy: {
                posicao: "asc",
            },
        });

        if (!itensGrade.length) {
            throw new BadRequestException(
                "A grade da ficha técnica não possui tamanhos configurados",
            );
        }

        // evita duplicação (idempotente)
        const existentes = await this.prisma.fichaTecnicaItem.findMany({
            where: {
                ficha_tecnica_id: ficha.id,
                cor_id: { in: cores_ids },
            },
            select: {
                cor_id: true,
                grade_versao_item_id: true,
            },
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
                const key = `${cor.id}-${item.id}`;

                if (!existentesSet.has(key)) {
                    novosItens.push({
                        ficha_tecnica_id: ficha.id,
                        cor_id: cor.id,
                        grade_versao_item_id: item.id,
                        quantidade: 0,
                    });
                }
            }
        }

        if (!novosItens.length) {
            return {
                message: "Todas as combinações já existem",
            };
        }

        await this.prisma.fichaTecnicaItem.createMany({
            data: novosItens,
        });

        return {
            message: "Matriz de cores x tamanhos criada com sucesso",
            itens_criados: novosItens.length,
        };
    }

    async removerCoresBatch(ficha_tecnica_id: number, cores_ids: number[]) {
        const ficha = await this.prisma.fichaTecnica.findUnique({
            where: { id: Number(ficha_tecnica_id) },
            select: {
                id: true,
                fabrico_id: true,
            },
        });

        if (!ficha) {
            throw new NotFoundException("Ficha técnica não encontrada");
        }

        // valida se cores pertencem ao fabrico
        const cores = await this.prisma.cor.findMany({
            where: {
                id: { in: cores_ids.map(Number) },
                fabrico_id: ficha.fabrico_id,
            },
            select: { id: true },
        });

        if (cores.length !== cores_ids.length) {
            throw new BadRequestException(
                "Uma ou mais cores não pertencem ao fabrico da ficha técnica",
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const itensExistentes = await tx.fichaTecnicaItem.findMany({
                where: {
                    ficha_tecnica_id: ficha.id,
                    cor_id: { in: cores_ids },
                },
                select: { id: true },
            });

            if (!itensExistentes.length) {
                return {
                    message: "Nenhum item encontrado para as cores informadas",
                    itens_removidos: 0,
                };
            }

            const deleteResult = await tx.fichaTecnicaItem.deleteMany({
                where: {
                    ficha_tecnica_id: ficha.id,
                    cor_id: { in: cores_ids },
                },
            });

            return {
                message: "Itens das cores removidos com sucesso",
                itens_removidos: deleteResult.count,
            };
        });
    }

    async syncCoresBatch(ficha_tecnica_id: number, cores_ids: number[]) {
        const ficha = await this.prisma.fichaTecnica.findUnique({
            where: { id: Number(ficha_tecnica_id) },
            select: {
                id: true,
                fabrico_id: true,
                grade_versao_id: true,
            },
        });

        if (!ficha) {
            throw new NotFoundException("Ficha técnica não encontrada");
        }

        const coresUnicas = [...new Set(cores_ids.map(Number))];

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
}
