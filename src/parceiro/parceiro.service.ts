import {
    BadRequestException,
    Injectable,
    ConflictException,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EnderecoService } from "../endereco/endereco.service";
import { CreateParceiroDto } from "./dto/create-parceiro.dto";
import { UpdateParceiroDto } from "./dto/update-parceiro.dto";
import { ProdutoService } from "src/produto/produto.service";

@Injectable()
export class ParceiroService {
    constructor(
        private prisma: PrismaService,
        private enderecoService: EnderecoService,
        private readonly produtoService: ProdutoService,
    ) {}

    async getAll(fabricoId: number) {
        try {
            return await this.prisma.parceiro.findMany({
                where: { fabrico_id: fabricoId },
                include: {
                    endereco: true,
                    parceiro_produto: { include: { produto: true } },
                },
            });
        } catch (error) {
            console.error("Erro ao buscar parceiros:", error);
            throw new NotFoundException("Nenhum parceiro encontrado");
        }
    }

    async getAllparceiroByFabrico(id: number) {
        const parceiros = await this.prisma.parceiro.findMany({
            where: { fabrico_id: id },
            include: { endereco: true },
        });

        return parceiros;
    }

    async getById(id: number, fabricoId?: number) {
        const parceiro = await this.prisma.parceiro.findFirst({
            where: {
                id,
                ...(fabricoId !== undefined ? { fabrico_id: fabricoId } : {}),
            },
            include: {
                endereco: true,
                parceiro_produto: { include: { produto: true } },
            },
        });

        if (!parceiro) {
            throw new NotFoundException("Parceiro não encontrado!");
        }

        return parceiro;
    }

    async create(data: CreateParceiroDto, fabricoId: number) {
        const { endereco, ...dadosparceiro } = data;

        const existente = await this.prisma.parceiro.findFirst({
            where: {
                nome: dadosparceiro.nome,
                fabrico_id: fabricoId,
            },
        });

        if (existente) {
            throw new ConflictException("Já existe um parceiro com esse nome nesse fabrico");
        }

        const enderecoCriado = await this.enderecoService.create(endereco ?? {});

        await this.prisma.parceiro.create({
            data: {
                ...dadosparceiro,
                fabrico_id: fabricoId,
                telefone: dadosparceiro.telefone ?? null,
                endereco: { connect: { id: enderecoCriado.id } },
                categoria: dadosparceiro.categoria ?? null,
            },
            include: { endereco: true },
        });

        return { message: "Parceiro criado com sucesso" };
    }

    async update(id: number, data: UpdateParceiroDto, fabricoId?: number) {
        const { endereco, fabrico_id, ...dadosparceiro } = data;

        if (fabrico_id !== undefined && fabricoId !== undefined && fabrico_id !== fabricoId) {
            throw new BadRequestException("Nao e permitido trocar o fabrico do parceiro");
        }

        const parceiroAtual = await this.getById(id, fabricoId);
        const fabricoChecar = fabricoId ?? parceiroAtual.fabrico_id;

        if (dadosparceiro.nome) {
            const nomeChecar = dadosparceiro.nome || parceiroAtual.nome;
            const existente = await this.prisma.parceiro.findFirst({
                where: {
                    nome: nomeChecar,
                    fabrico_id: fabricoChecar,
                    id: { not: id },
                },
            });

            if (existente) {
                throw new ConflictException("Já existe uma parceiro com esse nome nesse fabrico");
            }
        }

        if (endereco) {
            if (!parceiroAtual.endereco) {
                throw new NotFoundException("Endereço da parceiro não encontrado");
            }
            await this.enderecoService.update(parceiroAtual.endereco.id, endereco);
        }

        await this.prisma.$transaction(async (tx) => {
            const produtoIds = parceiroAtual.parceiro_produto.map((vinculo) => vinculo.produto_id);
            await this.produtoService.bloquearProdutosParaRecalculo(produtoIds, tx);
            await tx.parceiro.update({
                where: { id },
                data: { ...dadosparceiro },
            });
            await this.produtoService.recalcularCustosTotais(produtoIds, tx);
        });

        return { message: "Parceiro atualizado com sucesso" };
    }

    async delete(id: number, fabricoId?: number) {
        const parceiro = await this.getById(id, fabricoId);

        if (!parceiro) {
            throw new NotFoundException("Parceiro não encontrado");
        }

        await this.prisma.$transaction(async (tx) => {
            const produtoIds = parceiro.parceiro_produto.map((vinculo) => vinculo.produto_id);
            await this.produtoService.bloquearProdutosParaRecalculo(produtoIds, tx);
            await tx.parceiro.delete({
                where: { id },
            });
            await this.produtoService.recalcularCustosTotais(produtoIds, tx);
        });

        return { message: "Parceiro foi removido com sucesso" };
    }

    async getParceirosByFabricoECategoria(fabricoId: number, categoria: string) {
        return await this.prisma.parceiro.findMany({
            where: {
                fabrico_id: fabricoId,
                categoria: categoria,
            },
        });
    }
}
