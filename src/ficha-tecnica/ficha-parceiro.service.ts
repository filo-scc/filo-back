import {
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from "@nestjs/common";
import { CreateFichaParceiroDto } from "./dto/create-ficha-parceiro.dto";
import { UpdateFichaParceiroDto } from "./dto/update-ficha-parceiro.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class FichaParceiroService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateFichaParceiroDto, fabrico_id: number) {
        const fichaExiste = await this.prisma.fichaTecnica.findUnique({
            where: { id: data.ficha_id },
        });
        if (!fichaExiste || fichaExiste.fabrico_id !== fabrico_id) {
            throw new NotFoundException(
                "Ficha Técnica não encontrada ou o fabrico não possui essa ficha",
            );
        }

        const parceiroExiste = await this.prisma.parceiro.findUnique({
            where: { id: data.parceiro_id },
        });
        if (!parceiroExiste || fichaExiste.fabrico_id !== fabrico_id) {
            throw new NotFoundException(
                "Parceiro não encontrado ou o fabrico não possui esse parceiro",
            );
        }

        try {
            return await this.prisma.fichaParceiro.create({
                data: {
                    operacao: data.operacao,
                    valor: Number(data.valor),
                    ficha_id: Number(data.ficha_id),
                    parceiro_id: Number(data.parceiro_id),
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Este parceiro já está vinculado a esta ficha técnica");
            }
            throw new InternalServerErrorException("Erro ao vincular parceiro à ficha técnica");
        }
    }

    async getAll() {
        try {
            return this.prisma.fichaParceiro.findMany({
                include: {
                    ficha: true,
                    parceiro: true,
                },
            });
        } catch (error) {
            console.error("Nenhuma relação entre ficha parceiro no banco de dados", error);
            throw error;
        }
    }

    async findOne(ficha_id: number, parceiro_id: number, fabrico_id: number) {
        const existe = await this.prisma.fichaParceiro.findUnique({
            where: {
                ficha_id_parceiro_id: {
                    ficha_id,
                    parceiro_id,
                },
            },
            include: {
                ficha: true,
                parceiro: true,
            },
        });

        if (!existe || existe.ficha.fabrico_id !== fabrico_id) {
            throw new NotFoundException(
                "Essa relacionamento entre ficha e parceiro não existe ou o fabrico não a possui",
            );
        }
        return existe;
    }

    async update(
        ficha_id: number,
        parceiro_id: number,
        data: UpdateFichaParceiroDto,
        fabrico_id: number,
    ) {
        await this.findOne(ficha_id, parceiro_id, fabrico_id);

        return await this.prisma.fichaParceiro.update({
            where: {
                ficha_id_parceiro_id: {
                    ficha_id,
                    parceiro_id,
                },
            },
            data: {
                operacao: data.operacao,
                valor: data.valor,
            },
        });
    }

    async remove(ficha_id: number, parceiro_id: number, fabrico_id: number) {
        await this.findOne(ficha_id, parceiro_id, fabrico_id);

        await this.prisma.fichaParceiro.delete({
            where: {
                ficha_id_parceiro_id: {
                    ficha_id,
                    parceiro_id,
                },
            },
        });

        return `Relacionamento entre ficha ${ficha_id} e parceiro ${parceiro_id} foi removida com sucesso`;
    }

    async getFichaParceiroByFicha(ficha_id: number, fabrico_id: number) {
        const ficha = await this.prisma.fichaTecnica.findUnique({ where: { id: ficha_id } });
        if (!ficha || ficha.fabrico_id !== fabrico_id) {
            throw new NotFoundException("Ficha técnica não encontrada ou o fabrico não a possui");
        }

        return this.prisma.fichaParceiro.findMany({
            where: { ficha_id },
            include: { parceiro: true },
        });
    }

    async getFichaParceiroByParceiro(parceiro_id: number, fabrico_id: number) {
        const parceiro = await this.prisma.parceiro.findUnique({ where: { id: parceiro_id } });
        if (!parceiro || parceiro.fabrico_id !== fabrico_id) {
            throw new NotFoundException("Parceiro não encontrado ou o fabrico não a possui");
        }

        return this.prisma.fichaParceiro.findMany({
            where: { parceiro_id },
            include: { ficha: true },
        });
    }
}
