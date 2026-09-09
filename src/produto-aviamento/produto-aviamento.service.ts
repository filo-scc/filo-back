import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProdutoAviamentoDto } from "./dto/create-produto-aviamento.dto";
import { UpdateProdutoAviamentoDto } from "./dto/update-produto-aviamento.dto";
import { ProdutoService } from "../produto/produto.service";

@Injectable()
export class ProdutoAviamentoService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly produtoService: ProdutoService,
    ) {}

    private assertFabricoImutavel(fabricoInformado: number | undefined, fabricoId: number) {
        if (fabricoInformado !== undefined && Number(fabricoInformado) !== fabricoId) {
            throw new BadRequestException("Não é permitido alterar o fabrico do relacionamento");
        }
    }

    async create(
        createProdutoAviamentoDto: CreateProdutoAviamentoDto & { fabrico_id?: number },
        fabricoId: number,
    ) {
        this.assertFabricoImutavel(createProdutoAviamentoDto.fabrico_id, fabricoId);

        const { fabrico_id: _fabricoIdIgnorado, ...dadosDto } = createProdutoAviamentoDto;

        try {
            const produtoExiste = await this.prisma.produto.findFirst({
                where: { id: dadosDto.produto_id, fabrico_id: fabricoId },
            });
            if (!produtoExiste) {
                throw new NotFoundException("Produto não encontrado");
            }

            const aviamentoExiste = await this.prisma.aviamento.findFirst({
                where: { id: dadosDto.aviamento_id, fabrico_id: fabricoId },
            });
            if (!aviamentoExiste) {
                throw new NotFoundException("Aviamento não encontrado");
            }

            const relacaoExiste = await this.prisma.produtoAviamento.findFirst({
                where: {
                    produto_id: dadosDto.produto_id,
                    aviamento_id: dadosDto.aviamento_id,
                },
            });
            if (relacaoExiste) {
                throw new ConflictException("Esse aviamento já está vinculado a este produto");
            }

            return await this.prisma.$transaction(async (tx) => {
                await this.produtoService.bloquearProdutosParaRecalculo([dadosDto.produto_id], tx);
                const vinculo = await tx.produtoAviamento.create({
                    data: dadosDto,
                });
                await this.produtoService.recalcularCustoTotal(dadosDto.produto_id, tx);
                return vinculo;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Esse aviamento já está vinculado a este produto");
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            throw error;
        }
    }

    async findAll(fabricoId: number) {
        return this.prisma.produtoAviamento.findMany({
            where: {
                produto: { fabrico_id: fabricoId },
                aviamento: { fabrico_id: fabricoId },
            },
            include: {
                produto: true,
                aviamento: true,
            },
        });
    }

    async findOne(id: number, fabricoId: number) {
        const relacao = await this.prisma.produtoAviamento.findFirst({
            where: {
                id,
                produto: { fabrico_id: fabricoId },
                aviamento: { fabrico_id: fabricoId },
            },
            include: {
                produto: true,
                aviamento: true,
            },
        });

        if (!relacao) {
            throw new NotFoundException(
                "O relacionamento entre produto e aviamento não foi encontrado",
            );
        }

        return relacao;
    }

    async findAllByProduto(produto_id: number, fabricoId: number) {
        const produtoExiste = await this.prisma.produto.findFirst({
            where: { id: produto_id, fabrico_id: fabricoId },
        });

        if (!produtoExiste) {
            throw new NotFoundException("Produto não encontrado");
        }

        return this.prisma.produtoAviamento.findMany({
            where: { produto_id, aviamento: { fabrico_id: fabricoId } },
            include: { aviamento: true },
        });
    }

    async findAllByAviamento(aviamento_id: number, fabricoId: number) {
        const aviamentoExiste = await this.prisma.aviamento.findFirst({
            where: { id: aviamento_id, fabrico_id: fabricoId },
        });

        if (!aviamentoExiste) {
            throw new NotFoundException("Aviamento não encontrado");
        }

        return this.prisma.produtoAviamento.findMany({
            where: { aviamento_id, produto: { fabrico_id: fabricoId } },
            include: { produto: true },
        });
    }

    async update(
        id: number,
        payload: UpdateProdutoAviamentoDto & { fabrico_id?: number },
        fabricoId: number,
    ) {
        this.assertFabricoImutavel(payload.fabrico_id, fabricoId);

        const vinculoExistente = await this.findOne(id, fabricoId);
        const { fabrico_id: _fabricoIdIgnorado, ...dadosPayload } = payload;

        const quantidadeInformada = dadosPayload.quantidade !== undefined;
        const custoInformado = dadosPayload.custo !== undefined;

        const quantidadeMudou =
            quantidadeInformada &&
            Number(dadosPayload.quantidade) !== Number(vinculoExistente.quantidade);

        const dadosAtualizados: { quantidade?: number; custo?: number | null } = {};

        if (quantidadeInformada) {
            dadosAtualizados.quantidade = dadosPayload.quantidade;
        }
        if (custoInformado) {
            dadosAtualizados.custo = dadosPayload.custo;
        } else if (quantidadeMudou) {
            dadosAtualizados.custo = null;
        }

        try {
            return await this.prisma.$transaction(async (tx) => {
                await this.produtoService.bloquearProdutosParaRecalculo(
                    [vinculoExistente.produto_id],
                    tx,
                );
                const vinculo = await tx.produtoAviamento.update({
                    where: { id },
                    data: dadosAtualizados,
                });
                await this.produtoService.recalcularCustoTotal(vinculoExistente.produto_id, tx);
                return vinculo;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Esse aviamento já está vinculado a este produto");
                }
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            throw error;
        }
    }

    async remove(id: number, fabricoId: number) {
        const vinculoExistente = await this.findOne(id, fabricoId);

        try {
            return await this.prisma.$transaction(async (tx) => {
                await this.produtoService.bloquearProdutosParaRecalculo(
                    [vinculoExistente.produto_id],
                    tx,
                );
                const vinculo = await tx.produtoAviamento.delete({
                    where: { id },
                });
                await this.produtoService.recalcularCustoTotal(vinculoExistente.produto_id, tx);
                return vinculo;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2003") {
                    throw new NotFoundException("Relacionamento inválido");
                }
            }
            throw error;
        }
    }
}
