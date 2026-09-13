import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFabricoGradeDto } from "./dto/create-fabrico-grade.dto";
import { UpdateFabricoGradeDto } from "./dto/update-fabrico-grade.dto";
import { AuthenticatedUser } from "../auth/types/authenticated-user";

@Injectable()
export class FabricoGradeService {
    constructor(private readonly prisma: PrismaService) {}

    private getFabricoId(user: AuthenticatedUser): number {
        if (!user?.fabrico_id) {
            throw new BadRequestException("Usuário não possui um fabrico associado");
        }
        return user.fabrico_id;
    }

    private getFabricoIdParaOperacao(user: AuthenticatedUser, fabricoInformado?: number): number {
        if (user.cargo === "ADMIN") {
            if (
                fabricoInformado === undefined ||
                fabricoInformado === null ||
                Number.isNaN(Number(fabricoInformado))
            ) {
                throw new BadRequestException("Fabrico alvo obrigatório para usuários ADMIN");
            }
            return Number(fabricoInformado);
        }

        return this.getFabricoId(user);
    }

    private assertFabricoImutavel(fabricoInformado: number | undefined, fabricoId: number) {
        if (fabricoInformado !== undefined && Number(fabricoInformado) !== fabricoId) {
            throw new BadRequestException("Não é permitido alterar o fabrico da grade");
        }
    }

    async create(data: CreateFabricoGradeDto, user: AuthenticatedUser) {
        if (user.cargo === "GERENTE" || user.cargo === "PROPRIETARIO") {
            throw new ForbiddenException(
                "Usuário não tem permissão para criar vínculo de grade com fabrico",
            );
        }

        const fabricoId = this.getFabricoIdParaOperacao(user, data.fabrico_id);
        this.assertFabricoImutavel(data.fabrico_id, fabricoId);

        const grade = await this.prisma.grade.findUnique({
            where: { id: Number(data.grade_id) },
        });

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

        const { ...dadosCreate } = data;

        try {
            const link = await this.prisma.fabricoGrade.create({
                data: {
                    ...dadosCreate,
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

    async findAll(user: AuthenticatedUser) {
        if (user.cargo === "ADMIN") {
            return this.prisma.fabricoGrade.findMany({
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

        return this.prisma.fabricoGrade.findMany({
            where: { fabrico_id: this.getFabricoId(user) },
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

    async findAllByFabricoID(user: AuthenticatedUser) {
        if (user.cargo === "ADMIN") {
            throw new BadRequestException(
                "Usuário ADMIN deve informar o fabrico alvo em operação explícita",
            );
        }

        return this.prisma.fabricoGrade.findMany({
            where: {
                fabrico_id: this.getFabricoId(user),
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

    async findOne(id: number, user: AuthenticatedUser) {
        const link = await this.prisma.fabricoGrade.findFirst({
            where: {
                id,
                ...(user.cargo !== "ADMIN" ? { fabrico_id: this.getFabricoId(user) } : {}),
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

    async update(id: number, data: UpdateFabricoGradeDto, user: AuthenticatedUser) {
        const linkAtual = await this.findOne(id, user);

        if (user.cargo === "ADMIN") {
            if (data.fabrico_id !== undefined && Number(data.fabrico_id) !== linkAtual.fabrico_id) {
                throw new BadRequestException("Não é permitido alterar o fabrico da grade");
            }
        } else {
            this.assertFabricoImutavel(data.fabrico_id, this.getFabricoId(user));
        }

        const { ...dadosUpdate } = data;

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

    async remove(id: number, user: AuthenticatedUser) {
        if (user.cargo === "GERENTE" || user.cargo === "PROPRIETARIO") {
            throw new ForbiddenException(
                "Usuário não tem permissão para criar vínculo de grade com fabrico",
            );
        }
        const linkAtual = await this.findOne(id, user);

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
