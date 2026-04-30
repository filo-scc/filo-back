import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateFichaTecnicaDto } from "./dto/create-ficha-tecnica.dto";
import { UpdateFichaTecnicaDto } from "./dto/update-ficha-tecnica.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { ProdutoService } from "src/produto/produto.service";
import { EtapaService } from "src/etapa/etapa.service";
import { FabricoService } from "src/fabrico/fabrico.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class FichaTecnicaService {
    constructor(
        private prisma: PrismaService,
        private readonly produtoService: ProdutoService,
        private readonly fabricoService: FabricoService,
        private readonly etapaService: EtapaService,
    ) {}

    async create(data: CreateFichaTecnicaDto) {
        const produto_id = Number(data.produto_id);
        const fabrico_id = Number(data.fabrico_id);

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
                id: true,
                fabrico_id: true,
                grade_versao_id: true,
            },
        });

        if (!produto) {
            throw new NotFoundException("Produto não encontrado para este fabrico");
        }

        if (!produto.grade_versao_id) {
            throw new BadRequestException("O produto não possui uma grade vinculada");
        }

        const grade_versao_id = Number(
            (data as CreateFichaTecnicaDto & { grade_versao_id?: number }).grade_versao_id ??
                produto.grade_versao_id,
        );

        const gradeVersao = await this.prisma.gradeVersao.findFirst({
            where: {
                id: grade_versao_id,
                ativo: true,
            },
            select: {
                id: true,
                grade_id: true,
                ativo: true,
            },
        });

        if (!gradeVersao) {
            throw new BadRequestException("A versão de grade informada é inválida ou está inativa");
        }

        if (data.etapa_atual_id) {
            const etapa = await this.etapaService.getById(Number(data.etapa_atual_id));

            if (etapa.fabrico_id !== fabrico_id) {
                throw new BadRequestException(
                    "A etapa não pertence ao mesmo fabrico da ficha técnica",
                );
            }
        }

        try {
            return this.prisma.fichaTecnica.create({
                data: {
                    ...data,
                    produto_id,
                    fabrico_id,
                    grade_versao_id,
                    etapa_atual_id: data.etapa_atual_id ? Number(data.etapa_atual_id) : null,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    async findAllByFabricoId(id: number) {
        try {
            return this.prisma.fichaTecnica.findMany({
                where: { fabrico_id: Number(id) },
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
        const ficha = await this.prisma.fichaTecnica.findUnique({
            where: { id },
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
            },
        });

        if (!ficha) {
            throw new NotFoundException("Ficha não encontrada");
        }

        return ficha;
    }

    async update(id: number, data: UpdateFichaTecnicaDto) {
        const ficha = await this.findOne(id);

        if (data.produto_id && data.produto_id !== ficha.produto_id) {
            throw new BadRequestException("Não é permitido alterar o produto da ficha");
        }

        const fabricoId = Number(data.fabrico_id ?? ficha.fabrico_id);

        if (data.fabrico_id) {
            await this.fabricoService.getById(fabricoId);
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

                return tx.fichaTecnica.update({
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
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    async remove(id: number) {
        await this.findOne(id);

        await this.prisma.fichaTecnica.delete({
            where: { id },
        });

        return "Ficha técnica excluída com sucesso";
    }
}
