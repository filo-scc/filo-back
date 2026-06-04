import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EnderecoService } from "../endereco/endereco.service";
import { CreateParceiroDto } from "./dto/create-parceiro.dto";
import { UpdateParceiroDto } from "./dto/update-parceiro.dto";

@Injectable()
export class ParceiroService {
    constructor(
        private prisma: PrismaService,
        private enderecoService: EnderecoService,
    ) {}

    async getAll() {
        try {
            return await this.prisma.parceiro.findMany({
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

    async getById(id: number) {
        const parceiro = await this.prisma.parceiro.findUnique({
            where: { id },
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

    async create(data: CreateParceiroDto) {
        const { endereco, ...dadosparceiro } = data;

        const existente = await this.prisma.parceiro.findFirst({
            where: {
                nome: dadosparceiro.nome,
                fabrico_id: dadosparceiro.fabrico_id,
            },
        });

        if (existente) {
            throw new ConflictException("Já existe um parceiro com esse nome nesse fabrico");
        }

        const enderecoCriado = await this.enderecoService.create(endereco ?? {});

        await this.prisma.parceiro.create({
            data: {
                ...dadosparceiro,
                telefone: dadosparceiro.telefone ?? null,
                endereco: { connect: { id: enderecoCriado.id } },
            },
            include: { endereco: true },
        });

        return { message: "Parceiro criado com sucesso" };
    }

    async update(id: number, data: UpdateParceiroDto) {
        const { endereco, ...dadosparceiro } = data;

        const parceiroAtual = await this.getById(id);
        const fabricoChecar = dadosparceiro.fabrico_id || parceiroAtual.fabrico_id;

        if (dadosparceiro.nome || dadosparceiro.fabrico_id) {
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

        await this.prisma.parceiro.update({
            where: { id },
            data: { ...dadosparceiro },
        });

        return { message: "Parceiro atualizado com sucesso" };
    }

    async delete(id: number) {
        const parceiro = await this.getById(id);

        if (!parceiro) {
            throw new NotFoundException("Parceiro não encontrado");
        }

        await this.prisma.parceiro.delete({
            where: { id },
        });

        return { message: "Parceiro foi removido com sucesso" };
    }
}
