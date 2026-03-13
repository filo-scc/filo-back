import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FabricoModule } from './fabrico/fabrico.module';
import { FaccoesModule } from './faccoes/faccoes.module';
import { FaccaoModule } from './faccao/faccao.module';

@Module({
  imports: [FabricoModule, FaccoesModule, FaccaoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
