import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FabricoModule } from './fabrico/fabrico.module';
import { FaccaoModule } from './faccao/faccao.module';
import { ClienteModule } from './cliente/cliente.module';
import { ProdutoModule } from './produto/produto.module';

@Module({
  imports: [FabricoModule, ClienteModule, FaccaoModule, ProdutoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
