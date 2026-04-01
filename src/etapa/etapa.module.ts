import { Module } from "@nestjs/common";
import { EtapaService } from "./etapa.service";
import { EtapaController } from "./etapa.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { IconeModule } from "./icone.module";

@Module({
<<<<<<< HEAD
  imports: [PrismaModule, IconeModule],
  controllers: [EtapaController],
  providers: [EtapaService],
  exports: [EtapaService],

=======
    imports: [PrismaModule, IconeModule],
    controllers: [EtapaController],
    providers: [EtapaService],
    exports: [EtapaService],
>>>>>>> b281d516fc71fd1e704b85643da937deab84adca
})
export class EtapaModule {}
