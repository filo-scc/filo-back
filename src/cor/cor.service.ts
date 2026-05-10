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

@Injectable()
export class CorService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateCorDto) {
        const nome = normalizeText(data.nome);

        const existente = await this.prisma.cor.findFirst({
            where: {
                fabrico_id: Number(data.fabrico_id),
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
                    fabrico_id: Number(data.fabrico_id),
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

    async findAll() {
        try {
            return this.prisma.cor.findMany({
                orderBy: { nome: "asc" },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async findAllByFabricoID(fabrico_id: number) {
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

    async findOne(id: number) {
        try {
            const cor = await this.prisma.cor.findUnique({ where: { id } });
            if (!cor) {
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

    async update(id: number, data: UpdateCorDto) {
        const corAtual = await this.findOne(id);
        const nome = data.nome ? normalizeText(data.nome) : corAtual.nome;
        const codigo_hex = data.codigo_hex ?? corAtual.codigo_hex;
        const fabrico_id = data.fabrico_id ?? corAtual.fabrico_id;

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

    async remove(id: number) {
        await this.findOne(id);

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
