import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EnderecoService } from "../endereco/endereco.service";
import { CreateFaccaoDto } from "./dto/create-faccao.dto";
import { UpdateFaccaoDto } from "./dto/update-faccao.dto";

@Injectable()
export class FaccaoService {
    constructor(
        private prisma: PrismaService,
        private enderecoService: EnderecoService,
    ) {}

    async getAll() {
        try {
            return await this.prisma.faccao.findMany({
                include: {
                    endereco: true,
                    faccao_produto: { include: { produto: true } },
                },
            });
        } catch (error) {
            console.error("Erro ao buscar facções:", error);
            throw new NotFoundException("Nenhuma facção encontrada");
        }
    }

    async getAllFaccaoByFabrico(id: number) {
        const faccoes = await this.prisma.faccao.findMany({
            where: { fabrico_id: id },
            include: { endereco: true },
        });

        return faccoes;
    }

    async getById(id: number) {
        const faccao = await this.prisma.faccao.findUnique({
            where: { id },
            include: {
                endereco: true,
                faccao_produto: { include: { produto: true } },
            },
        });

        if (!faccao) {
            throw new NotFoundException("Facção não encontrada!");
        }

        return faccao;
    }

    async create(data: CreateFaccaoDto) {
        const { endereco, ...dadosFaccao } = data;

        const existente = await this.prisma.faccao.findFirst({
            where: {
                nome: dadosFaccao.nome,
                fabrico_id: dadosFaccao.fabrico_id,
            },
        });

        if (existente) {
            throw new ConflictException("Já existe uma facção com esse nome nesse fabrico");
        }

        const enderecoCriado = await this.enderecoService.create(endereco ?? {});

        await this.prisma.faccao.create({
            data: {
                ...dadosFaccao,
                telefone: dadosFaccao.telefone ?? null,
                endereco: { connect: { id: enderecoCriado.id } },
            },
            include: { endereco: true },
        });

        return { message: "Facção criada com sucesso" };
    }

    async update(id: number, data: UpdateFaccaoDto) {
        const { endereco, ...dadosFaccao } = data;

        const faccaoAtual = await this.getById(id);
        const fabricoChecar = dadosFaccao.fabrico_id || faccaoAtual.fabrico_id;

        if (dadosFaccao.nome || dadosFaccao.fabrico_id) {
            const nomeChecar = dadosFaccao.nome || faccaoAtual.nome;
            const existente = await this.prisma.faccao.findFirst({
                where: {
                    nome: nomeChecar,
                    fabrico_id: fabricoChecar,
                    id: { not: id },
                },
            });

            if (existente) {
                throw new ConflictException("Já existe uma facção com esse nome nesse fabrico");
            }
        }

        if (endereco) {
            if (!faccaoAtual.endereco) {
                throw new NotFoundException("Endereço da facção não encontrado");
            }
            await this.enderecoService.update(faccaoAtual.endereco.id, endereco);
        }

        await this.prisma.faccao.update({
            where: { id },
            data: { ...dadosFaccao },
        });

        return { message: "Facção atualizada com sucesso" };
    }

    async delete(id: number) {
        const faccao = await this.getById(id);

        if (!faccao) {
            throw new NotFoundException("Facção não encontrada");
        }

        await this.prisma.faccao.delete({
            where: { id },
        });

        return { message: "Facção foi removida com sucesso" };
    }
}
