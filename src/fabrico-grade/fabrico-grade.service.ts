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
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@Injectable()
export class FabricoGradeService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateFabricoGradeDto, user?: BusinessAuthenticatedUser) {
        const fabricoId = user?.fabrico_id ?? Number(data.fabrico_id);

        if (user && Number(data.fabrico_id) !== user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        const fabrico = await this.prisma.fabrico.findUnique({
            where: { id: Number(data.fabrico_id) },
        });
        if (!fabrico) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        const grade = await this.prisma.grade.findUnique({ where: { id: Number(data.grade_id) } });
        if (!grade) {
            throw new NotFoundException("Grade não encontrada");
        }

        const existente = await this.prisma.fabricoGrade.findFirst({
            where: {
                fabrico_id: fabricoId,
                grade_id: Number(data.grade_id),
            },
        });

        if (existente) {
            throw new ConflictException("Essa grade já está liberada para esse fabrico");
        }

        try {
            const link = await this.prisma.fabricoGrade.create({
                data: {
                    fabrico_id: fabricoId,
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
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Essa relação já existe");
            }
            throw error;
        }
    }

    async findAll() {
        try {
            return await this.prisma.fabricoGrade.findMany({
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
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async findAllByFabricoID(fabrico_id: number, user?: BusinessAuthenticatedUser) {
        if (user && Number(fabrico_id) !== user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        try {
            return await this.prisma.fabricoGrade.findMany({
                where: {
                    fabrico_id: Number(fabrico_id),
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
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async findOne(id: number, user?: BusinessAuthenticatedUser) {
        try {
            const link = await this.prisma.fabricoGrade.findUnique({
                where: { id },
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

            if (user && link.fabrico_id !== user.fabrico_id) {
                throw new NotFoundException("Fabrico não encontrado");
            }

            return link;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async update(id: number, data: UpdateFabricoGradeDto, user?: BusinessAuthenticatedUser) {
        await this.findOne(id, user);

        try {
            const link = await this.prisma.fabricoGrade.update({
                where: { id },
                data: {
                    ativo: data.ativo,
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
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    async remove(id: number, user?: BusinessAuthenticatedUser) {
        await this.findOne(id, user);

        try {
            const link = await this.prisma.fabricoGrade.update({
                where: { id },
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
