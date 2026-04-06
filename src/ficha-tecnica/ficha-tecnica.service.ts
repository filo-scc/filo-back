import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateFichaTecnicaDto } from "./dto/create-ficha-tecnica.dto";
import { UpdateFichaTecnicaDto } from "./dto/update-ficha-tecnica.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { ProdutoService } from "src/produto/produto.service";
import { EtapaService } from "src/etapa/etapa.service";
import { FabricoService } from "src/fabrico/fabrico.service";

@Injectable()
export class FichaTecnicaService {
    constructor(
        private prisma: PrismaService,
        private readonly produtoService: ProdutoService,
        private readonly fabricoService: FabricoService,
        private readonly etapaService: EtapaService,
    ) {}

    async create(data: CreateFichaTecnicaDto) {
        // Valida se o produto e fabrico existem
        await Promise.all([
            this.produtoService.getById(data.produto_id),
            this.fabricoService.getById(data.fabrico_id),
        ]);

        if (data.etapa_atual_id) {
            // Valida se a etapa existe
            const etapa = await this.etapaService.getById(data.etapa_atual_id);

            if (etapa.fabrico_id !== data.fabrico_id) {
                throw new BadRequestException(
                    "A etapa não pertence ao mesmo fabrico da ficha técnica"
                );
            }
        }

        return this.prisma.fichaTecnica.create({ data });
    }

    async findAllByFabricoId(id: number) {
        return this.prisma.fichaTecnica.findMany({
            where: { fabrico_id: id },
        });
    }

    async findAllByEtapaId(id: number) {
        return this.prisma.fichaTecnica.findMany({
            where: { etapa_atual_id: id },
        });
    }

    async findOne(id: number) {
        const ficha = await this.prisma.fichaTecnica.findUnique({
            where: { id },
        });

        if (!ficha) {
            throw new NotFoundException("Ficha não encontrada");
        }

        return ficha;
    }

    async update(id: number, data: UpdateFichaTecnicaDto) {
        const ficha = await this.findOne(id);

        if (data.produto_id && data.produto_id !== ficha.produto_id) {
            throw new BadRequestException("Não é permitido alterar o produto da ficha");
        }

        // Define qual fabrico será usado (novo ou atual)
        const fabricoId = data.fabrico_id ?? ficha.fabrico_id;

        // Se estiver alterando fabrico, valida existência
        if (data.fabrico_id) {
            await this.fabricoService.getById(data.fabrico_id);
        }

        if (data.etapa_atual_id) {
            // Valida se a etapa existe
            const etapa = await this.etapaService.getById(data.etapa_atual_id);

            if (etapa.fabrico_id !== fabricoId) {
                throw new BadRequestException(
                    "A etapa não pertence ao mesmo fabrico da ficha técnica"
                );
            }
        }

        return await this.prisma.fichaTecnica.update({
            where: { id },
            data,
        });
    }

    async remove(id: number) {
        await this.findOne(id);

        await this.prisma.fichaTecnica.delete({
            where: { id },
        });

        return "Ficha técnica excluída com sucesso";
    }
}
