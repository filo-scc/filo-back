import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEtapaDto } from "./dto/create-etapa.dto";
import { UpdateEtapaDto } from "./dto/update-etapa.dto";
import { Prisma } from "@prisma/client";
import { ProdutoService } from "src/produto/produto.service";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

type FabricoScope = AuthenticatedUser | number;

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

    private resolverFabricoId(scope: FabricoScope, fabricoInformado?: number): number {
        if (typeof scope === "number") {
            return scope;
        }

        if (scope.cargo === "ADMIN") {
            if (!fabricoInformado) {
                throw new BadRequestException("O fabrico deve ser informado pelo administrador");
            }

            return Number(fabricoInformado);
        }

        if (!scope.fabrico_id) {
            throw new ForbiddenException("Usuário não está associado a um fabrico");
        }

        if (fabricoInformado !== undefined && Number(fabricoInformado) !== scope.fabrico_id) {
            throw new BadRequestException(
                "Não é permitido escolher um fabrico diferente do usuário autenticado",
            );
        }

        return scope.fabrico_id;
    }

    async create(data: CreateEtapaDto, user: AuthenticatedUser) {
        const fabricoId = this.resolverFabricoId(user, data.fabrico_id);
        const dadosEtapa = { ...data };
        delete dadosEtapa.fabrico_id;

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
                        ...dadosEtapa,
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

    async findAll(user: AuthenticatedUser) {
        const fabricoId = this.resolverFabricoId(user);

        return this.findAllByFabricoID(fabricoId, user);
    }

    async findAllByFabricoID(fabrico_id: number, user: AuthenticatedUser) {
        const fabricoId = this.resolverFabricoId(user, fabrico_id);

        try {
            return this.prisma.etapa.findMany({
                where: { fabrico_id: fabricoId },
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

    async getById(id: number, scope: FabricoScope) {
        const fabricoId = this.resolverFabricoId(scope);
        const etapa = await this.prisma.etapa.findFirst({
            where: {
                id,
                fabrico_id: fabricoId,
            },
        });

        if (!etapa) {
            throw new NotFoundException("Etapa não encontrada");
        }

        return etapa;
    }

    async update(id: number, data: UpdateEtapaDto, scope: FabricoScope) {
        const fabricoId = this.resolverFabricoId(scope, data.fabrico_id);
        const etapaAtual = await this.getById(id, fabricoId);
        const dadosEtapa = { ...data };
        delete dadosEtapa.fabrico_id;

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

    async delete(id: number, scope: FabricoScope) {
        const fabricoId = this.resolverFabricoId(scope);
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
