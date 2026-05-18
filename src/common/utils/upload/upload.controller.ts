import {
    BadRequestException,
    Controller,
    Post,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import type { Express } from "express";

import { UploadService } from "./upload-photos-supabase";
import { RolesGuard } from "src/common/guards/roles.guard";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "ADMIN", "GERENTE")
@Controller("upload")
export class UploadController {
    constructor(private readonly uploadService: UploadService) {}

    @Post()
    @UseInterceptors(
        FileInterceptor("file", {
            storage: memoryStorage(),
            limits: {
                fileSize: 5 * 1024 * 1024,
            },
            fileFilter: (req, file, callback) => {
                const tiposAceitos = ["image/jpeg", "image/png", "image/webp"];

                if (!tiposAceitos.includes(file.mimetype)) {
                    return callback(new Error("Formato inválido. Use JPG, PNG ou WEBP."), false);
                }

                callback(null, true);
            },
        }),
    )
    async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
        const fabricoId = req.user?.fabrico_id;

        if (!fabricoId) {
            throw new BadRequestException("fabrico_id não encontrado no usuário autenticado");
        }

        return this.uploadService.uploadImagem(file, Number(fabricoId));
    }
}
