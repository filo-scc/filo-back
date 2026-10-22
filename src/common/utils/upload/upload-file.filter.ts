import { BadRequestException } from "@nestjs/common";
import type { Request } from "express";
import type { FileFilterCallback } from "multer";

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

export function uploadFileFilter(
    _req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
) {
    if (!TIPOS_ACEITOS.includes(file.mimetype)) {
        return callback(new BadRequestException("Formato inválido. Use JPG, PNG ou WEBP."));
    }

    callback(null, true);
}
