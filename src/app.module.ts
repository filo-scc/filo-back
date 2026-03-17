import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FabricoModule } from './fabrico/fabrico.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [FabricoModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
