import { Module } from "@nestjs/common";

import { UploadController } from "./upload.controller";
import { UploadService } from "./upload-photos-supabase";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [UploadController],
    providers: [UploadService],
})
export class UploadModule {}
