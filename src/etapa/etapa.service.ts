import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEtapaDto } from "./dto/create-etapa.dto";
import { UpdateEtapaDto } from "./dto/update-etapa.dto";
import { Prisma } from "@prisma/client";
import { ProdutoService } from "src/produto/produto.service";

@Injectable()
export class EtapaService {
    constructor(
        private prisma: PrismaService,
        private readonly produtoService: ProdutoService,
    ) {}

    private async obterProdutosDosFabricos(
        fabricoIds: number[],
        tx: Prisma.TransactionClient,
    ): Promise<number[]> {
        const produtos = await tx.produto.findMany({
            where: { fabrico_id: { in: [...new Set(fabricoIds)] } },
            select: { id: true },
        });
        return produtos.map((produto) => produto.id);
    }

    private assertFabricoImutavel(fabricoInformado: number | undefined, fabricoId: number) {
        if (fabricoInformado !== undefined && Number(fabricoInformado) !== fabricoId) {
            throw new BadRequestException("Não é permitido alterar o fabrico da etapa");
        }
    }

    async create(data: CreateEtapaDto, fabricoId: number) {
        this.assertFabricoImutavel(data.fabrico_id, fabricoId);

        if (data.icone_id) {
            const icone = await this.prisma.icone.findUnique({
                where: { id: data.icone_id },
            });

            if (!icone) {
                throw new NotFoundException("Ícone não encontrado");
            }
        }

        try {
            return await this.prisma.$transaction(async (tx) => {
                const produtoIds = await this.obterProdutosDosFabricos([fabricoId], tx);
                await this.produtoService.bloquearProdutosParaRecalculo(produtoIds, tx);
                const etapa = await tx.etapa.create({
                    data: {
                        ...data,
                        fabrico_id: fabricoId,
                    },
                });
                await this.produtoService.recalcularCustosTotais(produtoIds, tx);
                return etapa;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Etapa já cadastrada");
                }

                if (error.code === "P2003") {
                    throw new NotFoundException("Ícone não encontrado");
                }
            }

            throw error;
        }
    }

    async findAllByFabricoID(fabrico_id: number) {
        try {
            return this.prisma.etapa.findMany({
                where: { fabrico_id: Number(fabrico_id) },
                orderBy: { ordem: "asc" },
                include: {
                    icone: true,
                    icone_verde: true,
                    icone_cinza: true,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new ConflictException("Erro ao buscar etapas");
            }

            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros de consulta inválidos");
            }

            throw error;
        }
    }

    async getAll() {
        return this.prisma.etapa.findMany();
    }

    async getById(id: number, fabricoId?: number) {
        const etapa = await this.prisma.etapa.findFirst({
            where: {
                id,
                ...(fabricoId !== undefined ? { fabrico_id: fabricoId } : {}),
            },
        });

        if (!etapa) {
            throw new NotFoundException("Etapa não encontrada");
        }

        return etapa;
    }

    async update(id: number, data: UpdateEtapaDto, fabricoId: number) {
        this.assertFabricoImutavel(data.fabrico_id, fabricoId);
        const etapaAtual = await this.getById(id, fabricoId);
        const { fabrico_id: _fabricoIdIgnorado, ...dadosEtapa } = data;

        if (data.icone_id !== undefined && data.icone_id !== null) {
            const icone = await this.prisma.icone.findUnique({
                where: { id: data.icone_id },
            });

            if (!icone) {
                throw new NotFoundException("Ícone não encontrado");
            }
        }

        try {
            return await this.prisma.$transaction(async (tx) => {
                const produtoIds = await this.obterProdutosDosFabricos([etapaAtual.fabrico_id], tx);
                await this.produtoService.bloquearProdutosParaRecalculo(produtoIds, tx);
                const etapa = await tx.etapa.update({
                    where: { id },
                    data: {
                        ...dadosEtapa,
                    },
                });
                await this.produtoService.recalcularCustosTotais(produtoIds, tx);
                return etapa;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Etapa já cadastrada");
                }

                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }

            throw error;
        }
    }

    async delete(id: number, fabricoId: number) {
        const etapa = await this.getById(id, fabricoId);

        return this.prisma.$transaction(async (tx) => {
            const produtoIds = await this.obterProdutosDosFabricos([etapa.fabrico_id], tx);
            await this.produtoService.bloquearProdutosParaRecalculo(produtoIds, tx);
            const etapaRemovida = await tx.etapa.delete({
                where: { id },
            });
            await this.produtoService.recalcularCustosTotais(produtoIds, tx);
            return etapaRemovida;
        });
    }
}
