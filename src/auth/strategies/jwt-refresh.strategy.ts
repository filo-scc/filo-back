import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
            secretOrKey: process.env.JWT_REFRESH_SECRET,
            passReqToCallback: true,
        });
    }

    async validate(req: any, payload: any) {
        const refreshToken = req.body.refreshToken;

        const usuario = await this.prisma.usuario.findUnique({
            where: { id: payload.sub },
        });

        if (!usuario || !usuario.refresh_token_hash) {
            throw new UnauthorizedException();
        }

        const tokenValido = await bcrypt.compare(refreshToken, usuario.refresh_token_hash);

        if (!tokenValido) {
            throw new UnauthorizedException();
        }

        return {
            id: usuario.id,
            email: usuario.email,
            cargo: usuario.cargo,
            fabrico_id: usuario.fabrico_id,
        };
    }
}
