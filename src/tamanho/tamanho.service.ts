import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTamanhoDto } from "./dto/create-tamanho.dto";
import { UpdateTamanhoDto } from "./dto/update-tamanho.dto";
import { normalizeCode } from "src/common/utils/string-normalizer";

@Injectable()
export class TamanhoService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateTamanhoDto) {
        const codigo = normalizeCode(data.codigo);

        const existente = await this.prisma.tamanho.findFirst({
            where: {
                codigo: {
                    equals: codigo,
                    mode: Prisma.QueryMode.insensitive,
                },
            },
        });

        if (existente) {
            throw new ConflictException("Tamanho já existe");
        }

        try {
            const tamanho = await this.prisma.tamanho.create({
                data: {
                    codigo,
                    ordem_global: data.ordem_global,
                },
            });

            return {
                message: "Tamanho criado com sucesso",
                data: tamanho,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Conflito ao criar tamanho");
            }
            throw error;
        }
    }

    async findAll() {
        try {
            return this.prisma.tamanho.findMany({
                orderBy: [{ ordem_global: "asc" }, { codigo: "asc" }],
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
            const tamanho = await this.prisma.tamanho.findUnique({ where: { id } });

            if (!tamanho) {
                throw new NotFoundException("Tamanho não encontrado");
            }

            return tamanho;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }

    async update(id: number, data: UpdateTamanhoDto) {
        const tamanhoAtual = await this.findOne(id);

        const codigo = data.codigo ? normalizeCode(data.codigo) : tamanhoAtual.codigo;
        const ordem_global = data.ordem_global ?? tamanhoAtual.ordem_global;

        const existente = await this.prisma.tamanho.findFirst({
            where: {
                id: { not: id },
                codigo: {
                    equals: codigo,
                    mode: Prisma.QueryMode.insensitive,
                },
            },
        });

        if (existente) {
            throw new ConflictException("Já existe um tamanho com esse código");
        }

        try {
            const tamanho = await this.prisma.tamanho.update({
                where: { id },
                data: {
                    codigo,
                    ordem_global,
                },
            });

            return {
                message: "Tamanho atualizado com sucesso",
                data: tamanho,
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
            const tamanho = await this.prisma.tamanho.delete({ where: { id } });
            return {
                message: "Tamanho removido com sucesso",
                data: tamanho,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2003") {
                    throw new ConflictException(
                        "Não foi possível remover o tamanho porque ele está em uso",
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
