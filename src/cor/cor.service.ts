import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateCorDto } from "./dto/create-cor.dto";
import { UpdateCorDto } from "./dto/update-cor.dto";
import { normalizeText } from "src/common/utils/string-normalizer";

@Injectable()
export class CorService {
    constructor(private readonly prisma: PrismaService) {}

    private assertFabricoImutavel(fabricoInformado: number | undefined, fabricoId: number) {
        if (fabricoInformado !== undefined && Number(fabricoInformado) !== fabricoId) {
            throw new BadRequestException("Não é permitido alterar o fabrico da cor");
        }
    }

    async create(data: CreateCorDto, userFabricoId: number) {
        this.assertFabricoImutavel(data.fabrico_id, userFabricoId);

        const nome = normalizeText(data.nome);

        const existente = await this.prisma.cor.findFirst({
            where: {
                fabrico_id: userFabricoId,
                nome: {
                    equals: nome,
                    mode: Prisma.QueryMode.insensitive,
                },
            },
        });

        if (existente) {
            throw new ConflictException("Já existe uma cor com esse nome nesse fabrico");
        }

        const { fabrico_id: _fabricoIdIgnorado, ...dadosCreate } = data;

        try {
            const cor = await this.prisma.cor.create({
                data: {
                    ...dadosCreate,
                    nome,
                    fabrico_id: userFabricoId,
                },
            });

            return {
                message: "Cor criada com sucesso",
                data: cor,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException(
                        "Já existe uma cor com este nome para este fabrico",
                    );
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            throw error;
        }
    }

    async findAll(userFabricoId: number) {
        return this.prisma.cor.findMany({
            where: { fabrico_id: userFabricoId },
            orderBy: { nome: "asc" },
        });
    }

    async findAllByFabricoID(fabricoId: number) {
        return this.prisma.cor.findMany({
            where: { fabrico_id: fabricoId },
            orderBy: { nome: "asc" },
        });
    }

    async findOne(id: number, userFabricoId?: number) {
        const cor = await this.prisma.cor.findFirst({
            where: {
                id,
                ...(userFabricoId !== undefined ? { fabrico_id: userFabricoId } : {}),
            },
        });

        if (!cor) {
            throw new NotFoundException("Cor não encontrada");
        }

        return cor;
    }

    async update(id: number, data: UpdateCorDto, userFabricoId: number) {
        this.assertFabricoImutavel(data.fabrico_id, userFabricoId);

        const corAtual = await this.findOne(id, userFabricoId);
        const nome = data.nome ? normalizeText(data.nome) : corAtual.nome;

        if (data.nome) {
            const existente = await this.prisma.cor.findFirst({
                where: {
                    id: { not: id },
                    fabrico_id: userFabricoId,
                    nome: {
                        equals: nome,
                        mode: Prisma.QueryMode.insensitive,
                    },
                },
            });

            if (existente) {
                throw new ConflictException("Já existe uma cor com esse nome nesse fabrico");
            }
        }

        const { fabrico_id: _fabricoIdIgnorado, ...dadosUpdate } = data;

        try {
            const cor = await this.prisma.cor.update({
                where: { id: corAtual.id },
                data: {
                    ...dadosUpdate,
                    ...(data.nome ? { nome } : {}),
                    fabrico_id: corAtual.fabrico_id,
                },
            });

            return {
                message: "Cor atualizada com sucesso",
                data: cor,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException(
                        "Já existe uma cor com este nome para este fabrico",
                    );
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            throw error;
        }
    }

    async remove(id: number, userFabricoId: number) {
        const cor = await this.findOne(id, userFabricoId);

        try {
            const corDeletada = await this.prisma.cor.delete({
                where: { id: cor.id },
            });

            return {
                message: "Cor removida com sucesso",
                data: corDeletada,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2003") {
                    throw new ConflictException(
                        "Não foi possível remover a cor porque ela está em uso",
                    );
                }
            }
            throw error;
        }
    }
}
