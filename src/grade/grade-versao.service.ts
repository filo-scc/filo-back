import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGradeVersaoDto } from "src/grade/dto/create-grade-versao.dto";

@Injectable()
export class GradeVersaoService {
    constructor(private readonly prisma: PrismaService) {}

    private validateItens(itens: { tamanho_id: number; posicao: number }[]) {
        const posicoes = new Set<number>();
        const tamanhos = new Set<number>();

        for (const item of itens) {
            if (posicoes.has(item.posicao)) {
                throw new BadRequestException("A nova versão possui posições duplicadas");
            }
            if (tamanhos.has(item.tamanho_id)) {
                throw new BadRequestException("A nova versão possui tamanhos duplicados");
            }
            posicoes.add(item.posicao);
            tamanhos.add(item.tamanho_id);
        }
    }

    private async getLatestVersion(grade_id: number) {
        return this.prisma.gradeVersao.findFirst({
            where: { grade_id },
            orderBy: { versao: "desc" },
            include: {
                itens: {
                    include: { tamanho: true },
                    orderBy: { posicao: "asc" },
                },
            },
        });
    }

    private async syncGradeItems(
        grade_id: number,
        itens: { tamanho_id: number; posicao: number }[],
    ) {
        await this.prisma.gradeItem.deleteMany({ where: { grade_id } });
        await this.prisma.gradeItem.createMany({
            data: itens.map((item) => ({
                grade_id,
                tamanho_id: Number(item.tamanho_id),
                posicao: Number(item.posicao),
            })),
        });
    }

    async createFromGrade(grade_id: number, data: CreateGradeVersaoDto) {
        const grade = await this.prisma.grade.findUnique({
            where: { id: Number(grade_id) },
            include: {
                items: {
                    include: { tamanho: true },
                    orderBy: { posicao: "asc" },
                },
            },
        });

        if (!grade) {
            throw new NotFoundException("Grade não encontrada");
        }

        const latest = await this.getLatestVersion(Number(grade_id));

        let itensBase: { tamanho_id: number; posicao: number }[] = [];

        if (data.itens && data.itens.length > 0) {
            itensBase = data.itens.map((item) => ({
                tamanho_id: Number(item.tamanho_id),
                posicao: Number(item.posicao),
            }));
        } else if (latest) {
            itensBase = latest.itens.map((item) => ({
                tamanho_id: item.tamanho_id,
                posicao: item.posicao,
            }));

            const remover = new Set((data.remover_tamanho_ids ?? []).map(Number));
            const adicionar = new Set((data.adicionar_tamanho_ids ?? []).map(Number));

            itensBase = itensBase.filter((item) => !remover.has(item.tamanho_id));

            const tamanhosExistentes = new Set(itensBase.map((item) => item.tamanho_id));
            const maxPosicao = itensBase.reduce((max, item) => Math.max(max, item.posicao), 0);
            let posicaoAtual = maxPosicao;

            for (const tamanho_id of adicionar) {
                if (!tamanhosExistentes.has(tamanho_id)) {
                    posicaoAtual += 1;
                    itensBase.push({ tamanho_id, posicao: posicaoAtual });
                }
            }

            itensBase.sort((a, b) => a.posicao - b.posicao);
            itensBase = itensBase.map((item, index) => ({
                tamanho_id: item.tamanho_id,
                posicao: index + 1,
            }));
        } else {
            itensBase = grade.items.map((item) => ({
                tamanho_id: item.tamanho_id,
                posicao: item.posicao,
            }));
        }

        if (!itensBase.length) {
            throw new BadRequestException("A versão precisa ter pelo menos um tamanho");
        }

        this.validateItens(itensBase);

        const tamanhos = await this.prisma.tamanho.findMany({
            where: { id: { in: itensBase.map((item) => item.tamanho_id) } },
        });

        if (tamanhos.length !== itensBase.length) {
            throw new BadRequestException("Um ou mais tamanhos informados são inválidos");
        }

        try {
            const resultado = await this.prisma.$transaction(async (tx) => {
                const ultimaVersao = latest?.versao ?? 0;

                const novaVersao = await tx.gradeVersao.create({
                    data: {
                        grade_id: Number(grade_id),
                        versao: ultimaVersao + 1,
                        ativo: true,
                    },
                });

                await tx.gradeVersao.updateMany({
                    where: {
                        grade_id: Number(grade_id),
                        id: { not: novaVersao.id },
                    },
                    data: { ativo: false },
                });

                await tx.gradeVersaoItem.createMany({
                    data: itensBase.map((item) => ({
                        grade_versao_id: novaVersao.id,
                        tamanho_id: item.tamanho_id,
                        posicao: item.posicao,
                    })),
                });

                await this.syncGradeItems(Number(grade_id), itensBase);

                return tx.gradeVersao.findUnique({
                    where: { id: novaVersao.id },
                    include: {
                        grade: true,
                        itens: {
                            include: { tamanho: true },
                            orderBy: { posicao: "asc" },
                        },
                    },
                });
            });

            return {
                message: "Nova versão de grade criada com sucesso",
                data: resultado,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Conflito ao criar versão de grade");
            }
            throw error;
        }
    }

    async findAllByGradeID(grade_id: number) {
        try {
            return await this.prisma.gradeVersao.findMany({
                where: { grade_id: Number(grade_id) },
                orderBy: { versao: "desc" },
                include: {
                    itens: {
                        include: { tamanho: true },
                        orderBy: { posicao: "asc" },
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
        try {
            const versao = await this.prisma.gradeVersao.findUnique({
                where: { id },
                include: {
                    grade: true,
                    itens: {
                        include: { tamanho: true },
                        orderBy: { posicao: "asc" },
                    },
                },
            });

            if (!versao) {
                throw new NotFoundException("Versão de grade não encontrada");
            }

            return versao;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async activate(id: number) {
        const versao = await this.findOne(id);

        try {
            const resultado = await this.prisma.$transaction(async (tx) => {
                await tx.gradeVersao.updateMany({
                    where: {
                        grade_id: versao.grade_id,
                        id: { not: id },
                    },
                    data: { ativo: false },
                });

                return tx.gradeVersao.update({
                    where: { id },
                    data: { ativo: true },
                    include: {
                        grade: true,
                        itens: {
                            include: { tamanho: true },
                            orderBy: { posicao: "asc" },
                        },
                    },
                });
            });

            return {
                message: "Versão ativada com sucesso",
                data: resultado,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    async remove(id: number) {
        await this.findOne(id);

        try {
            const versao = await this.prisma.gradeVersao.update({
                where: { id },
                data: { ativo: false },
            });

            return {
                message: "Versão desativada com sucesso",
                data: versao,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }
}
