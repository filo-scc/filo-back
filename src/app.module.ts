import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { FabricoModule } from "./fabrico/fabrico.module";
import { ParceiroModule } from "./parceiro/parceiro.module";
import { ClienteModule } from "./cliente/cliente.module";
import { AuthModule } from "./auth/auth.module";
import { EnderecoModule } from "./endereco/endereco.module";
import { ProdutoModule } from "./produto/produto.module";
import { EtapaModule } from "./etapa/etapa.module";
import { FichaTecnicaModule } from "./ficha-tecnica/ficha-tecnica.module";
import { TamanhoModule } from "./tamanho/tamanho.module";
import { CorModule } from "./cor/cor.module";
import { FabricoGradeModule } from "./fabrico-grade/fabrico-grade.module";
import { GradeModule } from "./grade/grade.module";
import { TecidosModule } from "./tecidos/tecidos.module";
import { AviamentoModule } from "./aviamento/aviamento.module";
import { UploadModule } from "./common/utils/upload/upload.module";
import { ProdutoAviamentoModule } from "./produto-aviamento/produto-aviamento.module";
import { PedidoModule } from "./pedido/pedido.module";
import { ScheduleModule } from "@nestjs/schedule";
import { CronjobsModule } from "./cronjobs/cronjobs.module";
import { TipoProdutoModule } from "./tipo-produto/tipo-produto.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { NotificacoesModule } from "./notificacoes/notificacoes.module";

@Module({
    imports: [
        FabricoModule,
        ClienteModule,
        ParceiroModule,
        EtapaModule,
        EnderecoModule,
        ProdutoModule,
        AuthModule,
        FichaTecnicaModule,
        TamanhoModule,
        CorModule,
        FabricoGradeModule,
        GradeModule,
        TecidosModule,
        AviamentoModule,
        UploadModule,
        ProdutoAviamentoModule,
        PedidoModule,
        ScheduleModule.forRoot(),
        CronjobsModule,
        TipoProdutoModule,
        DashboardModule,
        NotificacoesModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
