import { UnauthorizedException } from "@nestjs/common";
import { Cargo } from "@prisma/client";
import { JwtRefreshStrategy } from "./jwt-refresh.strategy";

// eslint-disable-next-line
const bcrypt = require("bcrypt");

describe("JwtRefreshStrategy", () => {
    const prisma = {
        usuario: {
            findUnique: jest.fn(),
        },
    };

    const usuarioAtual = {
        id: 1,
        email: "atual@filo.com",
        nome: "Usuário atual",
        cargo: Cargo.PROPRIETARIO,
        foto_de_perfil: "foto.png",
        refresh_token_hash: "hash",
        fabrico_id: 2,
        fabrico: { id: 2, ativo: true },
    };

    let strategy: JwtRefreshStrategy;

    beforeEach(() => {
        process.env.JWT_REFRESH_SECRET = "refresh-secret-for-tests";
        strategy = new JwtRefreshStrategy(prisma as any);
        jest.clearAllMocks();
        jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("rejeita quando o usuário do token não existe", async () => {
        prisma.usuario.findUnique.mockResolvedValue(null);

        await expect(
            strategy.validate({ body: { refreshToken: "token" } } as any, { id: 99 }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejeita usuário de negócio sem fábrico", async () => {
        prisma.usuario.findUnique.mockResolvedValue({
            ...usuarioAtual,
            fabrico_id: null,
            fabrico: null,
        });

        await expect(
            strategy.validate({ body: { refreshToken: "token" } } as any, { id: 1 }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejeita usuário de negócio vinculado a fábrico inativo", async () => {
        prisma.usuario.findUnique.mockResolvedValue({
            ...usuarioAtual,
            fabrico: { id: 2, ativo: false },
        });

        await expect(
            strategy.validate({ body: { refreshToken: "token" } } as any, { id: 1 }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("usa cargo e fábrico atuais do banco em vez das claims desatualizadas", async () => {
        prisma.usuario.findUnique.mockResolvedValue(usuarioAtual);

        const resultado = await strategy.validate(
            { body: { refreshToken: "token" } } as any,
            {
                id: 1,
                email: "antigo@filo.com",
                cargo: Cargo.ADMIN,
                fabrico_id: 1,
            } as any,
        );

        expect(resultado).toEqual({
            id: usuarioAtual.id,
            email: usuarioAtual.email,
            nome: usuarioAtual.nome,
            cargo: Cargo.PROPRIETARIO,
            foto_de_perfil: usuarioAtual.foto_de_perfil,
            fabrico_id: 2,
            fabrico: { id: 2, ativo: true },
        });
    });

    it("ignora o vínculo legado de fábrico de um administrador global", async () => {
        prisma.usuario.findUnique.mockResolvedValue({
            ...usuarioAtual,
            cargo: Cargo.ADMIN,
            fabrico_id: 2,
            fabrico: { id: 2, ativo: true },
        });

        await expect(
            strategy.validate({ body: { refreshToken: "token" } } as any, { id: 1 }),
        ).resolves.toMatchObject({
            cargo: Cargo.ADMIN,
            fabrico_id: null,
            fabrico: null,
        });
    });
});
