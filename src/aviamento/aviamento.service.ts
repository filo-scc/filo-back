import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma, Aviamento } from "@prisma/client";
import { CreateAviamentoDto } from "./dto/create-aviamento.dto";
import { UpdateAviamentoDto } from "./dto/update-aviamento.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { ProdutoService } from "src/produto/produto.service";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

@Injectable()
export class AviamentoService {
    constructor(
        private prisma: PrismaService,
        private readonly produtoService: ProdutoService,
    ) {}

    private assertFabricoImutavel(fabricoInformado: number | undefined, fabricoId: number) {
        if (fabricoInformado !== undefined && Number(fabricoInformado) !== fabricoId) {
            throw new BadRequestException("Não é permitido alterar o fabrico do aviamento");
        }
    }

    async create(data: CreateAviamentoDto, fabricoId: number): Promise<Aviamento> {
        this.assertFabricoImutavel(data.fabrico_id, fabricoId);

        const fabricoExists = await this.prisma.fabrico.findUnique({
            where: { id: fabricoId },
        });

        if (!fabricoExists) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        try {
            return await this.prisma.aviamento.create({
                data: {
                    nome: data.nome,
                    fabrico_id: fabricoId,
                    custo_unitario: data.custo_unitario,
                    unidade_de_medida: data.unidade_de_medida,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException(
                        "Já existe um aviamento com este nome para este fabrico",
                    );
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Fabrico não encontrado");
                }
            }

            throw error;
        }
    }

    async findAll(user: AuthenticatedUser) {
        if (!user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return this.prisma.aviamento.findMany({
            where: { fabrico_id: user.fabrico_id },
            orderBy: { nome: "asc" },
        });
    }

    async getById(id: number, user: AuthenticatedUser) {
        if (!user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        const aviamento = await this.prisma.aviamento.findFirst({
            where: {
                id,
                fabrico_id: user.fabrico_id,
            },
        });

        if (!aviamento) {
            throw new NotFoundException("Aviamento não encontrado");
        }

        return aviamento;
    }

    async findAllFabrico(fabrico_id: number, user: AuthenticatedUser) {
        if (!user.fabrico_id || fabrico_id !== user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return this.prisma.aviamento.findMany({
            where: { fabrico_id },
            orderBy: { nome: "asc" },
        });
    }

    async delete(id: number, user: AuthenticatedUser) {
        const aviamento = await this.getById(id, user);

        await this.prisma.$transaction(async (tx) => {
            const vinculos = await tx.produtoAviamento.findMany({
                where: { aviamento_id: aviamento.id },
                select: { produto_id: true },
            });

            const produtoIds = vinculos.map((v) => v.produto_id);

            await this.produtoService.bloquearProdutosParaRecalculo(produtoIds, tx);
            await tx.aviamento.delete({ where: { id: aviamento.id } });
            await this.produtoService.recalcularCustosTotais(produtoIds, tx);
        });

        return `O aviamento com o id ${id} foi deletado com sucesso`;
    }

    async update(
        id: number,
        dados: UpdateAviamentoDto,
        user: AuthenticatedUser,
    ): Promise<Aviamento> {
        if (!user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        this.assertFabricoImutavel(dados.fabrico_id, user.fabrico_id);
        const aviamento = await this.getById(id, user);

        const { fabrico_id: _fabricoIdIgnorado, ...dadosUpdate } = dados;

        try {
            return await this.prisma.$transaction(async (tx) => {
                const vinculos = await tx.produtoAviamento.findMany({
                    where: { aviamento_id: id },
                    select: {
                        id: true,
                        produto_id: true,
                        quantidade: true,
                        custo: true,
                    },
                });

                const produtoIds = vinculos.map((v) => v.produto_id);

                await this.produtoService.bloquearProdutosParaRecalculo(produtoIds, tx);

                const custoUnitarioMudou =
                    dados.custo_unitario !== undefined &&
                    Number(dados.custo_unitario) !== Number(aviamento.custo_unitario);

                if (custoUnitarioMudou) {
                    const vinculosComCustoDerivado = vinculos
                        .filter((v) => Number(v.custo) > 0)
                        .map((v) => v.id);

                    if (vinculosComCustoDerivado.length) {
                        await tx.produtoAviamento.updateMany({
                            where: { id: { in: vinculosComCustoDerivado } },
                            data: { custo: null },
                        });
                    }
                }

                const aviamentoAtualizado = await tx.aviamento.update({
                    where: { id },
                    data: {
                        ...dadosUpdate,
                        fabrico_id: aviamento.fabrico_id,
                    },
                });

                await this.produtoService.recalcularCustosTotais(produtoIds, tx);

                return aviamentoAtualizado;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException(
                        "Já existe um aviamento com este nome para este fabrico",
                    );
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }

            throw error;
        }
    }
}
