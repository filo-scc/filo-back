import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import type { Express } from "express";

import { UploadService } from "./upload-photos-supabase";
import { RolesGuard } from "src/common/guards/roles.guard";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";
import { UploadContextDto } from "./dto/upload-context.dto";
import { Cargo } from "@prisma/client";

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
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser() user: AuthenticatedUser,
        @Body() context: UploadContextDto,
    ) {
        const destino = user.cargo === Cargo.ADMIN ? context.fabrico_id : user.fabrico_id;

        return this.uploadService.uploadImagem(file, destino ?? "admin");
    }
}
