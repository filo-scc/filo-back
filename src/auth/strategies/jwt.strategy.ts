import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { Cargo } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthenticatedUser, JwtPayload } from "../types/authenticated-user";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_ACCESS_SECRET,
            ignoreExpiration: false,
        });
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        if (!Number.isInteger(payload?.id)) {
            throw new UnauthorizedException();
        }

        const usuario = await this.prisma.usuario.findUnique({
            where: { id: payload.id },
            select: {
                id: true,
                email: true,
                nome: true,
                cargo: true,
                foto_de_perfil: true,
                refresh_token_hash: true,
                fabrico_id: true,
                fabrico: {
                    select: {
                        id: true,
                        ativo: true,
                    },
                },
            },
        });

        if (!usuario || !usuario.refresh_token_hash) {
            throw new UnauthorizedException();
        }

        const dadosComuns = {
            id: usuario.id,
            email: usuario.email,
            nome: usuario.nome,
            foto_de_perfil: usuario.foto_de_perfil,
        };

        if (usuario.cargo === Cargo.ADMIN) {
            return {
                ...dadosComuns,
                cargo: usuario.cargo,
                fabrico_id: null,
                fabrico: null,
            };
        }

        if (usuario.fabrico_id === null || !usuario.fabrico || !usuario.fabrico.ativo) {
            throw new UnauthorizedException();
        }

        return {
            ...dadosComuns,
            cargo: usuario.cargo,
            fabrico_id: usuario.fabrico_id,
            fabrico: usuario.fabrico,
        };
    }
}
