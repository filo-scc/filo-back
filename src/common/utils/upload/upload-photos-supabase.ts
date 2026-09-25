import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from "@nestjs/common";

import { supabase } from "src/common/libs/supabase";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class UploadService {
    constructor(private readonly prisma: PrismaService) {}

    async uploadImagem(file: Express.Multer.File, destino: number | "admin") {
        try {
            if (!file) {
                throw new BadRequestException("Arquivo não enviado");
            }

            if (typeof destino === "number") {
                const fabrico = await this.prisma.fabrico.findFirst({
                    where: { id: destino, ativo: true },
                    select: { id: true },
                });

                if (!fabrico) {
                    throw new NotFoundException("Fábrico não encontrado ou inativo");
                }
            }

            const partesNome = file.originalname.split(".");
            const extensao = partesNome.length > 1 ? partesNome.pop() : "png";

            const nomeArquivo = `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2)}.${extensao}`;

            const pathArquivo = `${destino}/${nomeArquivo}`;

            const { data, error } = await supabase.storage
                .from("uploads")
                .upload(pathArquivo, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false,
                });

            if (error) {
                console.error("Erro Supabase:", error);
                throw error;
            }

            const { data: publicUrlData } = supabase.storage
                .from("uploads")
                .getPublicUrl(data.path);

            return {
                fabrico_id: typeof destino === "number" ? destino : null,
                path: data.path,
                url: publicUrlData.publicUrl,
            };
        } catch (error) {
            console.error(error);

            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }

            throw new InternalServerErrorException("Erro ao fazer upload da imagem");
        }
    }
}
