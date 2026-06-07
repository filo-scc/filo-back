import {
    NotFoundException,
    Injectable,
    ConflictException,
    BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProdutoDto } from "./dto/create-produto.dto";
import { UpdateProduto } from "./dto/update-produto.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class ProdutoService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateProdutoDto) {
        if (data.grade_versao_id) {
            const grade = await this.prisma.gradeVersao.findFirst({
                where: {
                    id: data.grade_versao_id,
                    ativo: true,
                },
            });

            if (!grade) {
                throw new BadRequestException("Versão de grade inválida ou inativa");
            }
        }

        try {
            return await this.prisma.produto.create({
                data: { ...data },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Já existe um produto com este nome para este fabrico");
            }
            throw error;
        }
    }

    async findAll() {
        return this.prisma.produto.findMany();
    }

    async getById(id: number) {
        const produto = await this.prisma.produto.findUnique({
            where: { id },
            include: { tecido: true },
        });

        if (!produto) {
            throw new NotFoundException("Produto não encontrado");
        }

        return produto;
    }

    async delete(id: number) {
        const produto = await this.prisma.produto.findUnique({ where: { id } });
        if (produto) {
            await this.prisma.produto.delete({ where: { id } });
            return `O produto com o id ${id} foi deletado com sucesso`;
        } else {
            throw new NotFoundException("Produto não encontrado");
        }
    }

    async update(id: number, dados: UpdateProduto) {
        const produto = await this.prisma.produto.findUnique({
            where: { id },
        });

        if (!produto) {
            throw new NotFoundException("Produto não encontrado");
        }

        if (dados.grade_versao_id) {
            const grade = await this.prisma.gradeVersao.findFirst({
                where: {
                    id: dados.grade_versao_id,
                    ativo: true,
                },
            });

            if (!grade) {
                throw new BadRequestException("Versão de grade inválida ou inativa");
            }
        }

        try {
            await this.prisma.produto.update({
                where: { id },
                data: { ...dados },
            });

            return `O produto com o id ${id} foi atualizado`;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Já existe um produto com este nome para este fabrico");
            }
            throw error;
        }
    }

    async findAllFabrico(fabrico_id: number) {
        const produtos = await this.prisma.produto.findMany({
            where: { fabrico_id: fabrico_id },
            include: {
                tecido: true,
            },
        });
        return produtos;
    }

    async getUnassociatedProductsForClient(cliente_id: number, fabrico_id: number) {
        return this.prisma.produto.findMany({
            where: {
                fabrico_id: fabrico_id,
                // Filtra produtos que NÃO estão na tabela clienteProduto para este cliente
                cliente_produto: {
                    none: {
                        cliente_id: cliente_id,
                    },
                },
            },
        });
    }
}
