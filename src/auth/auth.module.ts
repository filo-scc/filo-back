import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy";
import { EnderecoModule } from "src/endereco/endereco.module";

@Module({
    imports: [PrismaModule, PassportModule, JwtModule.register({}), EnderecoModule],
    providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
    controllers: [AuthController],
})
export class AuthModule {}
