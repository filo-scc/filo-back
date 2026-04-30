import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { FabricoModule } from "./fabrico/fabrico.module";
import { FaccaoModule } from "./faccao/faccao.module";
import { ClienteModule } from "./cliente/cliente.module";
import { AuthModule } from "./auth/auth.module";
import { EnderecoModule } from "./endereco/endereco.module";
import { ProdutoModule } from "./produto/produto.module";
import { EtapaModule } from "./etapa/etapa.module";
import { FichaTecnicaModule } from "./ficha-tecnica/ficha-tecnica.module";
import { TamanhoModule } from './tamanho/tamanho.module';
import { CorModule } from './cor/cor.module';
import { FabricoGradeModule } from './fabrico-grade/fabrico-grade.module';
import { GradeModule } from './grade/grade.module';

@Module({
    imports: [
        FabricoModule,
        ClienteModule,
        FaccaoModule,
        EtapaModule,
        EnderecoModule,
        ProdutoModule,
        AuthModule,
        FichaTecnicaModule,
        TamanhoModule,
        CorModule,
        FabricoGradeModule,
        GradeModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
