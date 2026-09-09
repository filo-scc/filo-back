import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFabricoGradeDto } from "./dto/create-fabrico-grade.dto";
import { UpdateFabricoGradeDto } from "./dto/update-fabrico-grade.dto";

@Injectable()
export class FabricoGradeService {
    constructor(private readonly prisma: PrismaService) {}

    private assertFabricoImutavel(fabricoInformado: number | undefined, fabricoId: number) {
        if (fabricoInformado !== undefined && Number(fabricoInformado) !== fabricoId) {
            throw new BadRequestException("Não é permitido alterar o fabrico da grade");
        }
    }

    async create(data: CreateFabricoGradeDto, userFabricoId: number) {
        this.assertFabricoImutavel(data.fabrico_id, userFabricoId);

        const grade = await this.prisma.grade.findUnique({
            where: { id: Number(data.grade_id) },
        });

        if (!grade) {
            throw new NotFoundException("Grade não encontrada");
        }

        const existente = await this.prisma.fabricoGrade.findFirst({
            where: {
                fabrico_id: userFabricoId,
                grade_id: Number(data.grade_id),
            },
        });

        if (existente) {
            throw new ConflictException("Essa grade já está liberada para esse fabrico");
        }

        const {...dadosCreate } = data;

        try {
            const link = await this.prisma.fabricoGrade.create({
                data: {
                    ...dadosCreate,
                    fabrico_id: userFabricoId,
                    grade_id: Number(data.grade_id),
                    ativo: data.ativo ?? true,
                },
                include: {
                    fabrico: true,
                    grade: true,
                },
            });

            return {
                message: "Grade liberada para o fabrico com sucesso",
                data: link,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Essa relação já existe");
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    async findAll(userFabricoId?: number) {
        return this.prisma.fabricoGrade.findMany({
            where: userFabricoId !== undefined ? { fabrico_id: userFabricoId } : {},
            include: {
                fabrico: true,
                grade: {
                    include: {
                        items: {
                            include: { tamanho: true },
                            orderBy: { posicao: "asc" },
                        },
                        versoes: {
                            where: { ativo: true },
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
                },
            },
            orderBy: { id: "asc" },
        });
    }

    async findAllByFabricoID(fabricoId: number) {
        return this.prisma.fabricoGrade.findMany({
            where: {
                fabrico_id: fabricoId,
                ativo: true,
            },
            include: {
                grade: {
                    include: {
                        items: {
                            include: { tamanho: true },
                            orderBy: { posicao: "asc" },
                        },
                        versoes: {
                            where: { ativo: true },
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
                },
            },
            orderBy: { id: "asc" },
        });
    }

    async findOne(id: number, userFabricoId?: number) {
        const link = await this.prisma.fabricoGrade.findFirst({
            where: {
                id,
                ...(userFabricoId !== undefined ? { fabrico_id: userFabricoId } : {}),
            },
            include: {
                fabrico: true,
                grade: {
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
                    },
                },
            },
        });

        if (!link) {
            throw new NotFoundException("Vínculo fabrico-grade não encontrado");
        }

        return link;
    }

    async update(id: number, data: UpdateFabricoGradeDto, userFabricoId: number) {
        this.assertFabricoImutavel(data.fabrico_id, userFabricoId);

        const linkAtual = await this.findOne(id, userFabricoId);

        const {...dadosUpdate } = data;

        try {
            const link = await this.prisma.fabricoGrade.update({
                where: { id: linkAtual.id },
                data: {
                    ...dadosUpdate,
                    fabrico_id: linkAtual.fabrico_id,
                },
                include: {
                    fabrico: true,
                    grade: true,
                },
            });

            return {
                message: "Vínculo atualizado com sucesso",
                data: link,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Essa relação já existe");
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    async remove(id: number, userFabricoId: number) {
        const linkAtual = await this.findOne(id, userFabricoId);

        try {
            const link = await this.prisma.fabricoGrade.update({
                where: { id: linkAtual.id },
                data: { ativo: false },
            });

            return {
                message: "Grade desativada para o fabrico com sucesso",
                data: link,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }
}
