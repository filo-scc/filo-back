import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_ACCESS_SECRET,
            ignoreExpiration: false,
        });
    }

    async validate(payload: any) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id: payload.sub },
        });

        if (!usuario || !usuario.refresh_token_hash) {
            throw new UnauthorizedException();
        }

        return {
            id: payload.sub,
            email: payload.email,
            cargo: payload.cargo,
            fabrico_id: payload.fabrico_id,
        };
    }
}
