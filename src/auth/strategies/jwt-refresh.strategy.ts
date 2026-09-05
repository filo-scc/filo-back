import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import * as bcrypt from "bcrypt";
import { Cargo } from "@prisma/client";
import type { Request } from "express";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthenticatedUser, JwtPayload } from "../types/authenticated-user";

interface RefreshTokenRequest extends Request {
    body: {
        refreshToken?: string;
    };
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
            secretOrKey: process.env.JWT_REFRESH_SECRET,
            passReqToCallback: true,
        });
    }

    async validate(req: RefreshTokenRequest, payload: JwtPayload): Promise<AuthenticatedUser> {
        const refreshToken = req.body.refreshToken;

        if (!refreshToken || !Number.isInteger(payload?.id)) {
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

        const tokenValido = await bcrypt.compare(refreshToken, usuario.refresh_token_hash);

        if (!tokenValido) {
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
