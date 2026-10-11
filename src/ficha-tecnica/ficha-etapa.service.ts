import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateFichaEtapaDto } from "./dto/update-ficha-etapa.dto";
import { FichaTecnicaService } from "./ficha-tecnica.service";
import { EtapaService } from "src/etapa/etapa.service";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

const paraData = (valor: string | null): Date | null => (valor === null ? null : new Date(valor));

@Injectable()
export class FichaEtapaService {
    constructor(
        private prisma: PrismaService,
        private readonly fichaTecnicaService: FichaTecnicaService,
        private readonly etapaService: EtapaService,
    ) {}

    private async getFichaEtapaOrFail(id: number, fabricoId: number) {
        const fichaEtapa = await this.prisma.fichaEtapa.findFirst({
            where: {
                id,
                ficha_tecnica: { fabrico_id: fabricoId },
            },
        });

        if (!fichaEtapa) {
            throw new NotFoundException("FichaEtapa não encontrada");
        }

        return fichaEtapa;
    }

    private resolverFabricoId(user: AuthenticatedUser): number {
        if (user.cargo === "ADMIN") {
            throw new ForbiddenException("Administrador não pode acessar fichas-etapas");
        }

        if (!user.fabrico_id) {
            throw new ForbiddenException("Usuário não está associado a um fabrico");
        }

        return user.fabrico_id;
    }

    private assertFichaDoFabrico(ficha: { fabrico_id: number }, fabricoId: number) {
        if (ficha.fabrico_id !== fabricoId) {
            throw new NotFoundException("FichaEtapa não encontrada");
        }
    }

    async getByFichaTecnica(ficha_tecnica_id: number, user: AuthenticatedUser) {
        const fabricoId = this.resolverFabricoId(user);
        const ficha = await this.fichaTecnicaService.findOne(ficha_tecnica_id, fabricoId);
        this.assertFichaDoFabrico(ficha, fabricoId);

        const fichasEtapas = await this.prisma.fichaEtapa.findMany({
            where: { ficha_tecnica_id },
            include: {
                etapa: true,
            },
        });

        return fichasEtapas;
    }

    async getByEtapa(etapa_id: number, user: AuthenticatedUser) {
        const fabricoId = this.resolverFabricoId(user);

        await this.etapaService.getById(etapa_id, fabricoId);

        const fichasEtapas = await this.prisma.fichaEtapa.findMany({
            where: {
                etapa_id,
                ficha_tecnica: { fabrico_id: fabricoId },
            },
            include: {
                ficha_tecnica: true,
            },
        });

        return fichasEtapas;
    }

    private assertDatasValidas(
        atual: { data_inicio: Date | null; data_fim: Date | null },
        data: UpdateFichaEtapaDto,
    ) {
        // `null` explícito passa pela validação (campo opcional) e reabriria uma etapa encerrada.
        if (data.data_fim === null && atual.data_fim !== null) {
            throw new ConflictException("Não é possível reabrir uma etapa já encerrada");
        }

        // Abrir e fechar etapas é papel da transferência, que move a ficha junto com o histórico.
        if (data.data_fim && atual.data_fim === null) {
            throw new ConflictException(
                "Não é possível encerrar uma etapa em andamento por aqui: ela é encerrada pela transferência de etapa",
            );
        }

        const inicio =
            data.data_inicio === undefined ? atual.data_inicio : paraData(data.data_inicio);
        const fim = data.data_fim === undefined ? atual.data_fim : paraData(data.data_fim);

        if (inicio && fim && inicio.getTime() > fim.getTime()) {
            throw new BadRequestException("A data de início não pode ser posterior à data de fim");
        }
    }

    async updateFichaEtapa(id: number, data: UpdateFichaEtapaDto, user: AuthenticatedUser) {
        const fabricoId = this.resolverFabricoId(user);
        const atual = await this.getFichaEtapaOrFail(id, fabricoId);
        this.assertDatasValidas(atual, data);

        try {
            return await this.prisma.fichaEtapa.update({
                where: { id },
                data: {
                    observacoes: data.observacoes,
                    data_inicio: data.data_inicio,
                    data_fim: data.data_fim,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Ficha Etapa já cadastrada");
                }

                if (error.code === "P2003") {
                    throw new NotFoundException("Ficha Etapa não encontrado");
                }
            }

            throw error;
        }
    }
}
