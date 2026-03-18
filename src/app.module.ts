import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FabricoModule } from './fabrico/fabrico.module';
import { FaccaoModule } from './faccao/faccao.module';
import { ClienteModule } from './cliente/cliente.module';
import { EnderecoModule } from './endereco/endereco.module';

@Module({
  imports: [FabricoModule, ClienteModule, FaccaoModule, EnderecoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
