import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { FabricoModule } from "./fabrico/fabrico.module";
import { FaccaoModule } from "./faccao/faccao.module";
import { ClienteModule } from "./cliente/cliente.module";
import { AuthModule } from "./auth/auth.module";
import { EnderecoModule } from "./endereco/endereco.module";
import { EtapaModule } from "./etapa/etapa.module";

@Module({
    imports: [FabricoModule, ClienteModule, FaccaoModule, EtapaModule, EnderecoModule, AuthModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
