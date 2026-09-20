import {
    BadRequestException,
    Injectable,
    ConflictException,
    NotFoundException,
    ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EnderecoService } from "../endereco/endereco.service";
import { CreateParceiroDto } from "./dto/create-parceiro.dto";
import { UpdateParceiroDto } from "./dto/update-parceiro.dto";
import { ProdutoService } from "src/produto/produto.service";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

@Injectable()
export class ParceiroService {
    constructor(
        private prisma: PrismaService,
        private enderecoService: EnderecoService,
        private readonly produtoService: ProdutoService,
    ) {}

    private getTenantFabricoId(user: AuthenticatedUser): number {
        if (user.cargo === "ADMIN") {
            throw new ForbiddenException("Administrador não pode acessar parceiros sem escopo");
        }

        if (!user.fabrico_id) {
            throw new ForbiddenException("Usuario não esta associado a um fabrico");
        }

        return user.fabrico_id;
    }

    private assertPayloadNaoEscolheFabrico(data: { fabrico_id?: unknown }) {
        if (Object.prototype.hasOwnProperty.call(data, "fabrico_id")) {
            throw new BadRequestException("fabrico_id não deve ser informado para parceiros");
        }
    }

    async getAll(user: AuthenticatedUser) {
        const fabricoId = this.getTenantFabricoId(user);

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

    async getById(id: number, user: AuthenticatedUser) {
        const fabricoId = this.getTenantFabricoId(user);

        const parceiro = await this.prisma.parceiro.findFirst({
            where: {
                id,
                fabrico_id: fabricoId,
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

    async create(data: CreateParceiroDto, user: AuthenticatedUser) {
        this.assertPayloadNaoEscolheFabrico(data as { fabrico_id?: unknown });
        const fabricoId = this.getTenantFabricoId(user);
        const { endereco, produtos, ...dadosparceiro } = data;
        void produtos;

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

    async update(id: number, data: UpdateParceiroDto, user: AuthenticatedUser) {
        this.assertPayloadNaoEscolheFabrico(data as { fabrico_id?: unknown });
        const fabricoId = this.getTenantFabricoId(user);
        const { endereco, produtos, ...dadosparceiro } = data;
        void produtos;

        const parceiroAtual = await this.getById(id, user);

        if (dadosparceiro.nome) {
            const existente = await this.prisma.parceiro.findFirst({
                where: {
                    nome: dadosparceiro.nome,
                    fabrico_id: fabricoId,
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

    async delete(id: number, user: AuthenticatedUser) {
        const parceiro = await this.getById(id, user);

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

    async getParceirosByFabricoECategoria(categoria: string, user: AuthenticatedUser) {
        const fabricoId = this.getTenantFabricoId(user);

        return await this.prisma.parceiro.findMany({
            where: {
                fabrico_id: fabricoId,
                categoria: categoria,
            },
        });
    }
}
