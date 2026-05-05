import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGradeDto } from "./dto/create-grade.dto";
import { UpdateGradeDto } from "./dto/update-grade.dto";
import { normalizeText } from "src/common/utils/string-normalizer";

@Injectable()
export class GradeService {
    constructor(private readonly prisma: PrismaService) {}

    private validateItens(itens: { tamanho_id: number; posicao: number }[]) {
        const posicoes = new Set<number>();
        const tamanhos = new Set<number>();

        for (const item of itens) {
            if (posicoes.has(item.posicao)) {
                throw new BadRequestException("A grade possui posições duplicadas");
            }
            if (tamanhos.has(item.tamanho_id)) {
                throw new BadRequestException("A grade possui tamanhos duplicados");
            }
            posicoes.add(item.posicao);
            tamanhos.add(item.tamanho_id);
        }
    }

    async create(data: CreateGradeDto) {
        const nome = normalizeText(data.nome);
        const itens = data.itens ?? [];

        if (!itens.length) {
            throw new BadRequestException("Informe ao menos um tamanho para a grade");
        }

        this.validateItens(itens);

        const existente = await this.prisma.grade.findFirst({
            where: {
                nome: {
                    equals: nome,
                    mode: Prisma.QueryMode.insensitive,
                },
            },
        });

        if (existente) {
            throw new ConflictException("Já existe uma grade com esse nome");
        }

        const tamanhos = await this.prisma.tamanho.findMany({
            where: {
                id: {
                    in: itens.map((item) => Number(item.tamanho_id)),
                },
            },
        });

        if (tamanhos.length !== itens.length) {
            throw new BadRequestException("Um ou mais tamanhos informados são inválidos");
        }

        try {
            const resultado = await this.prisma.$transaction(async (tx) => {
                const grade = await tx.grade.create({
                    data: {
                        nome,
                        ativo: data.ativo ?? true,
                    },
                });

                await tx.gradeItem.createMany({
                    data: itens.map((item) => ({
                        grade_id: grade.id,
                        tamanho_id: Number(item.tamanho_id),
                        posicao: Number(item.posicao),
                    })),
                });

                const versao = await tx.gradeVersao.create({
                    data: {
                        grade_id: grade.id,
                        versao: 1,
                        ativo: true,
                    },
                });

                await tx.gradeVersaoItem.createMany({
                    data: itens.map((item) => ({
                        grade_versao_id: versao.id,
                        tamanho_id: Number(item.tamanho_id),
                        posicao: Number(item.posicao),
                    })),
                });

                return tx.grade.findUnique({
                    where: { id: grade.id },
                    include: {
                        items: {
                            include: { tamanho: true },
                            orderBy: { posicao: "asc" },
                        },
                        versoes: {
                            orderBy: { versao: "asc" },
                            include: {
                                itens: {
                                    include: { tamanho: true },
                                    orderBy: { posicao: "asc" },
                                },
                            },
                        },
                    },
                });
            });

            return {
                message: "Grade criada com sucesso",
                data: resultado,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Conflito ao criar grade");
            }
            throw error;
        }
    }

    async findAll() {
        try {
            return this.prisma.grade.findMany({
                include: {
                    items: {
                        include: { tamanho: true },
                        orderBy: { posicao: "asc" },
                    },
                    versoes: {
                        orderBy: { versao: "desc" },
                        take: 1,
                        include: {
                            itens: {
                                include: { tamanho: true },
                                orderBy: { posicao: "asc" },
                            },
                        },
                    },
                },
                orderBy: { nome: "asc" },
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
            const grade = await this.prisma.grade.findUnique({
                where: { id },
                include: {
                    items: {
                        include: { tamanho: true },
                        orderBy: { posicao: "asc" },
                    },
                    versoes: {
                        orderBy: { versao: "desc" },
                        include: {
                            itens: {
                                include: { tamanho: true },
                                orderBy: { posicao: "asc" },
                            },
                        },
                    },
                    fabrico_grades: {
                        include: { fabrico: true },
                    },
                },
            });

            if (!grade) {
                throw new NotFoundException("Grade não encontrada");
            }

            return grade;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async update(id: number, data: UpdateGradeDto) {
        const gradeAtual = await this.findOne(id);
        const nome = data.nome ? normalizeText(data.nome) : gradeAtual.nome;
        const ativo = data.ativo ?? gradeAtual.ativo;

        const existente = await this.prisma.grade.findFirst({
            where: {
                id: { not: id },
                nome: {
                    equals: nome,
                    mode: Prisma.QueryMode.insensitive,
                },
            },
        });

        if (existente) {
            throw new ConflictException("Já existe uma grade com esse nome");
        }

        try {
            const grade = await this.prisma.grade.update({
                where: { id },
                data: { nome, ativo },
            });
            return {
                message: "Grade atualizada com sucesso",
                data: grade,
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
            const grade = await this.prisma.grade.update({
                where: { id },
                data: { ativo: false },
            });

            return {
                message: "Grade desativada com sucesso",
                data: grade,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }
}
