import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCorDto } from "./dto/create-cor.dto";
import { UpdateCorDto } from "./dto/update-cor.dto";
import { normalizeText } from "src/common/utils/string-normalizer";
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@Injectable()
export class CorService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateCorDto, user: BusinessAuthenticatedUser) {
        const nome = normalizeText(data.nome);

        const existente = await this.prisma.cor.findFirst({
            where: {
                fabrico_id: user.fabrico_id,
                nome: {
                    equals: nome,
                    mode: Prisma.QueryMode.insensitive,
                },
            },
        });

        if (existente) {
            throw new ConflictException("Já existe uma cor com esse nome nesse fabrico");
        }

        try {
            const cor = await this.prisma.cor.create({
                data: {
                    nome,
                    codigo_hex: data.codigo_hex,
                    fabrico_id: user.fabrico_id,
                    tipo: data.tipo,
                    foto: data.foto,
                },
            });

            return {
                message: "Cor criada com sucesso",
                data: cor,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Cor já cadastrada");
            }
            throw error;
        }
    }

    async findAll(user: BusinessAuthenticatedUser) {
        try {
            return this.prisma.cor.findMany({
                where: { fabrico_id: user.fabrico_id },
                orderBy: { nome: "asc" },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async findAllByFabricoID(fabrico_id: number, user: BusinessAuthenticatedUser) {
        if (fabrico_id !== user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        try {
            return this.prisma.cor.findMany({
                where: { fabrico_id: Number(fabrico_id) },
                orderBy: { nome: "asc" },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async findOne(id: number, user: BusinessAuthenticatedUser) {
        try {
            const cor = await this.prisma.cor.findUnique({ where: { id } });
            if (!cor || cor.fabrico_id !== user.fabrico_id) {
                throw new NotFoundException("Cor não encontrada");
            }
            return cor;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async update(id: number, data: UpdateCorDto, user: BusinessAuthenticatedUser) {
        const corAtual = await this.findOne(id, user);
        const nome = data.nome ? normalizeText(data.nome) : corAtual.nome;
        const codigo_hex = data.codigo_hex ?? corAtual.codigo_hex;
        const fabrico_id = corAtual.fabrico_id;

        const existente = await this.prisma.cor.findFirst({
            where: {
                id: { not: id },
                fabrico_id: Number(fabrico_id),
                nome: {
                    equals: nome,
                    mode: Prisma.QueryMode.insensitive,
                },
            },
        });

        if (existente) {
            throw new ConflictException("Já existe uma cor com esse nome nesse fabrico");
        }

        try {
            const cor = await this.prisma.cor.update({
                where: { id },
                data: {
                    nome,
                    codigo_hex,
                    fabrico_id: Number(fabrico_id),
                },
            });

            return {
                message: "Cor atualizada com sucesso",
                data: cor,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    async remove(id: number, user: BusinessAuthenticatedUser) {
        await this.findOne(id, user);

        try {
            const cor = await this.prisma.cor.delete({ where: { id } });
            return {
                message: "Cor removida com sucesso",
                data: cor,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2003") {
                    throw new ConflictException(
                        "Não foi possível remover a cor porque ela está em uso",
                    );
                }
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }
}
