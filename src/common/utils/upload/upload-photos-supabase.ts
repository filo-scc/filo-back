import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";

import { supabase } from "src/common/libs/supabase";

@Injectable()
export class UploadService {
    async uploadImagem(file: Express.Multer.File, fabricoId: number) {
        try {
            if (!file) {
                throw new BadRequestException("Arquivo não enviado");
            }

            if (!fabricoId || Number.isNaN(fabricoId)) {
                throw new BadRequestException("fabrico_id inválido");
            }

            const partesNome = file.originalname.split(".");
            const extensao = partesNome.length > 1 ? partesNome.pop() : "png";

            const nomeArquivo = `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2)}.${extensao}`;

            const pathArquivo = `${fabricoId}/${nomeArquivo}`;

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
                fabrico_id: fabricoId,
                path: data.path,
                url: publicUrlData.publicUrl,
            };
        } catch (error) {
            console.error(error);

            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new InternalServerErrorException("Erro ao fazer upload da imagem");
        }
    }
}
