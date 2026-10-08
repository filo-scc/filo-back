import { UnauthorizedException } from "@nestjs/common";
import { Cargo } from "@prisma/client";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
    const prisma = {
        usuario: {
            findUnique: jest.fn(),
        },
    };

    const usuarioAtual = {
        id: 1,
        email: "atual@filo.com",
        nome: "Usuário atual",
        cargo: Cargo.GERENTE,
        foto_de_perfil: null,
        refresh_token_hash: "hash",
        fabrico_id: 2,
        fabrico: { id: 2, ativo: true },
    };

    let strategy: JwtStrategy;

    beforeEach(() => {
        process.env.JWT_ACCESS_SECRET = "access-secret-for-tests";
        strategy = new JwtStrategy(prisma as any);
        jest.clearAllMocks();
    });

    it("rejeita quando o usuário do token não existe", async () => {
        prisma.usuario.findUnique.mockResolvedValue(null);

        await expect(strategy.validate({ id: 99 })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejeita usuário de negócio sem fábrico", async () => {
        prisma.usuario.findUnique.mockResolvedValue({
            ...usuarioAtual,
            fabrico_id: null,
            fabrico: null,
        });

        await expect(strategy.validate({ id: 1 })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejeita usuário de negócio vinculado a fábrico inativo", async () => {
        prisma.usuario.findUnique.mockResolvedValue({
            ...usuarioAtual,
            fabrico: { id: 2, ativo: false },
        });

        await expect(strategy.validate({ id: 1 })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("usa cargo e fábrico atuais do banco em vez das claims desatualizadas", async () => {
        prisma.usuario.findUnique.mockResolvedValue(usuarioAtual);

        const resultado = await strategy.validate({
            id: 1,
            email: "antigo@filo.com",
            cargo: Cargo.ADMIN,
            fabrico_id: 1,
        } as any);

        expect(resultado).toEqual({
            id: usuarioAtual.id,
            email: usuarioAtual.email,
            nome: usuarioAtual.nome,
            cargo: Cargo.GERENTE,
            foto_de_perfil: null,
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

        await expect(strategy.validate({ id: 1 })).resolves.toMatchObject({
            cargo: Cargo.ADMIN,
            fabrico_id: null,
            fabrico: null,
        });
    });
});
