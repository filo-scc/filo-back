import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { NotificacoesService } from "./notificacoes.service";

const { PrismaClientKnownRequestError, PrismaClientValidationError } = Prisma;

describe("NotificacoesService", () => {
    let service: NotificacoesService;
    let prisma: any;

    const usuarioFabricoId = 10;

    const createDto = {
        fabrico_id: 10,
        tipo: "PEDIDO_ATRASADO",
        categoria: "OPERACIONAL",
        severidade: "ALERTA",
        fonte: "SISTEMA",
        titulo: "Pedido atrasado",
        mensagem: "O pedido 12 está atrasado",
        destinatario_ids: [1, 2],
    } as any;

    beforeEach(() => {
        prisma = {
            fabrico: {
                findUnique: jest.fn(),
            },
            usuario: {
                findMany: jest.fn(),
            },
            notificacao: {
                create: jest.fn(),
                findMany: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            notificacaoDestinatario: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
        };
        service = new NotificacoesService(prisma);
    });

    it("cria notificação com destinatários", async () => {
        prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });
        prisma.usuario.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        prisma.notificacao.create.mockResolvedValue({ id: 1, titulo: "Pedido atrasado" });

        await expect(service.create(createDto, usuarioFabricoId)).resolves.toEqual({
            message: "Notificação criada com sucesso",
            data: { id: 1, titulo: "Pedido atrasado" },
        });
        expect(prisma.usuario.findMany).toHaveBeenCalledWith({
            where: { id: { in: [1, 2] }, fabrico_id: 10 },
            select: { id: true },
        });
        expect(prisma.notificacao.create).toHaveBeenCalled();
    });

    it("rejeita create com destinatário de outro fabrico", async () => {
        prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });
        prisma.usuario.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.create(createDto, usuarioFabricoId)).rejects.toThrow(
            new BadRequestException("Um ou mais destinatários não pertencem a este fabrico"),
        );
        expect(prisma.notificacao.create).not.toHaveBeenCalled();
    });

    it("rejeita create com destinatários duplicados", async () => {
        prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });

        await expect(
            service.create({ ...createDto, destinatario_ids: [7, 7] }, usuarioFabricoId),
        ).rejects.toThrow(new BadRequestException("Destinatários duplicados não são permitidos"));
        expect(prisma.usuario.findMany).not.toHaveBeenCalled();
        expect(prisma.notificacao.create).not.toHaveBeenCalled();
    });

    it("rejeita create para fabrico de outro tenant", async () => {
        await expect(service.create(createDto, 99)).rejects.toThrow(
            new NotFoundException("Fabrico não encontrado"),
        );
        expect(prisma.fabrico.findUnique).not.toHaveBeenCalled();
    });

    it("rejeita create sem fabrico", async () => {
        prisma.fabrico.findUnique.mockResolvedValue(null);

        await expect(service.create(createDto, usuarioFabricoId)).rejects.toThrow(
            new NotFoundException("Fabrico não encontrado"),
        );
    });

    it("traduz FK inválida no create", async () => {
        prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });
        prisma.usuario.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        prisma.notificacao.create.mockRejectedValue(
            new PrismaClientKnownRequestError("fk", {
                code: "P2003",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.create(createDto, usuarioFabricoId)).rejects.toThrow(
            new BadRequestException("Destinatário ou referência inválida"),
        );
    });

    it("traduz destinatário duplicado no create (P2002)", async () => {
        prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });
        prisma.usuario.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        prisma.notificacao.create.mockRejectedValue(
            new PrismaClientKnownRequestError("unique", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.create(createDto, usuarioFabricoId)).rejects.toThrow(
            new BadRequestException("Destinatários duplicados não são permitidos"),
        );
    });

    it("lista notificações do fabrico do usuário", async () => {
        prisma.notificacao.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAll(usuarioFabricoId)).resolves.toEqual([{ id: 1 }]);
        expect(prisma.notificacao.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { fabrico_id: 10 },
                orderBy: { ocorreu_em: "desc" },
            }),
        );
    });

    it("busca notificação existente do fabrico do usuário", async () => {
        prisma.notificacao.findFirst.mockResolvedValue({ id: 1 });

        await expect(service.findOne(1, usuarioFabricoId)).resolves.toEqual({ id: 1 });
        expect(prisma.notificacao.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 1, fabrico_id: 10 },
            }),
        );
    });

    it("rejeita notificação inexistente ou de outro fabrico", async () => {
        prisma.notificacao.findFirst.mockResolvedValue(null);

        await expect(service.findOne(1, usuarioFabricoId)).rejects.toThrow(
            new NotFoundException("Notificação não encontrada"),
        );
    });

    it("atualiza notificação existente", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1, destinatarios: [] } as any);
        prisma.notificacao.update.mockResolvedValue({ id: 1, titulo: "Novo título" });

        await expect(
            service.update(1, { titulo: "Novo título" }, usuarioFabricoId),
        ).resolves.toEqual({
            message: "Notificação atualizada com sucesso",
            data: { id: 1, titulo: "Novo título" },
        });
    });

    it("atualiza destinatários válidos do fabrico", async () => {
        const lidaEm = new Date("2026-08-20T10:00:00.000Z");
        jest.spyOn(service, "findOne").mockResolvedValue({
            id: 1,
            destinatarios: [
                { usuario_id: 1, lida_em: lidaEm, entregas: [{ provider_message_id: "msg-1" }] },
                { usuario_id: 3, lida_em: null, entregas: [] },
            ],
        } as any);
        prisma.usuario.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        prisma.notificacao.update.mockResolvedValue({ id: 1 });

        await expect(
            service.update(1, { destinatario_ids: [1, 2] }, usuarioFabricoId),
        ).resolves.toEqual({
            message: "Notificação atualizada com sucesso",
            data: { id: 1 },
        });
        expect(prisma.usuario.findMany).toHaveBeenCalledWith({
            where: { id: { in: [1, 2] }, fabrico_id: 10 },
            select: { id: true },
        });
        expect(prisma.notificacao.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({
                    destinatarios: {
                        deleteMany: { usuario_id: { in: [3] } },
                        create: [{ usuario_id: 2 }],
                    },
                }),
            }),
        );
    });

    it("preserva destinatários retidos sem recriar leitura e entregas", async () => {
        const lidaEm = new Date("2026-08-20T10:00:00.000Z");
        jest.spyOn(service, "findOne").mockResolvedValue({
            id: 1,
            destinatarios: [
                { usuario_id: 1, lida_em: lidaEm, entregas: [{ provider_message_id: "msg-1" }] },
            ],
        } as any);
        prisma.usuario.findMany.mockResolvedValue([{ id: 1 }]);
        prisma.notificacao.update.mockResolvedValue({ id: 1 });

        await service.update(1, { destinatario_ids: [1] }, usuarioFabricoId);

        expect(prisma.notificacao.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.not.objectContaining({ destinatarios: expect.anything() }),
            }),
        );
    });

    it("rejeita update com destinatário de outro fabrico", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1, destinatarios: [] } as any);
        prisma.usuario.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(
            service.update(1, { destinatario_ids: [1, 99] }, usuarioFabricoId),
        ).rejects.toThrow(
            new BadRequestException("Um ou mais destinatários não pertencem a este fabrico"),
        );
        expect(prisma.notificacao.update).not.toHaveBeenCalled();
    });

    it("rejeita update com destinatários duplicados", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1, destinatarios: [] } as any);

        await expect(
            service.update(1, { destinatario_ids: [7, 7] }, usuarioFabricoId),
        ).rejects.toThrow(new BadRequestException("Destinatários duplicados não são permitidos"));
        expect(prisma.usuario.findMany).not.toHaveBeenCalled();
        expect(prisma.notificacao.update).not.toHaveBeenCalled();
    });

    it("remove notificação existente", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1 } as any);
        prisma.notificacao.delete.mockResolvedValue({ id: 1 });

        await expect(service.remove(1, usuarioFabricoId)).resolves.toEqual({
            message: "Notificação removida com sucesso",
            data: { id: 1 },
        });
    });

    it("lista notificações do usuário logado no fabrico", async () => {
        const lidaEm = new Date("2026-08-28T12:00:00.000Z");
        prisma.notificacao.findMany.mockResolvedValue([
            {
                id: 1,
                titulo: "Pedido atrasado",
                destinatarios: [{ lida_em: null }],
            },
            {
                id: 2,
                titulo: "Pagamento recebido",
                destinatarios: [{ lida_em: lidaEm }],
            },
        ]);

        await expect(service.findMine(7, usuarioFabricoId)).resolves.toEqual([
            {
                id: 1,
                titulo: "Pedido atrasado",
                lida: false,
                lida_em: null,
            },
            {
                id: 2,
                titulo: "Pagamento recebido",
                lida: true,
                lida_em: lidaEm,
            },
        ]);
        expect(prisma.notificacao.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    fabrico_id: 10,
                    destinatarios: { some: { usuario_id: 7 } },
                },
                orderBy: { ocorreu_em: "desc" },
            }),
        );
    });

    it("marca notificação como lida", async () => {
        prisma.notificacaoDestinatario.findUnique.mockResolvedValue({
            id: 5,
            notificacao_id: 1,
            usuario_id: 7,
            lida_em: null,
            notificacao: { fabrico_id: 10 },
        });
        prisma.notificacaoDestinatario.update.mockResolvedValue({
            id: 5,
            lida_em: new Date("2026-08-28T12:00:00.000Z"),
            notificacao: { id: 1 },
        });

        await expect(service.marcarComoLida(1, 7, usuarioFabricoId)).resolves.toEqual({
            message: "Notificação marcada como lida",
            data: {
                id: 5,
                lida_em: new Date("2026-08-28T12:00:00.000Z"),
                notificacao: { id: 1 },
            },
        });
        expect(prisma.notificacaoDestinatario.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 5 },
                data: { lida_em: expect.any(Date) },
            }),
        );
    });

    it("não sobrescreve lida_em se já estiver lida", async () => {
        const lidaEm = new Date("2026-08-20T10:00:00.000Z");
        prisma.notificacaoDestinatario.findUnique.mockResolvedValue({
            id: 5,
            lida_em: lidaEm,
            notificacao: { fabrico_id: 10 },
        });
        prisma.notificacaoDestinatario.update.mockResolvedValue({
            id: 5,
            lida_em: lidaEm,
            notificacao: { id: 1 },
        });

        await service.marcarComoLida(1, 7, usuarioFabricoId);

        expect(prisma.notificacaoDestinatario.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { lida_em: lidaEm },
            }),
        );
    });

    it("rejeita marcar como lida se o usuário não for destinatário", async () => {
        prisma.notificacaoDestinatario.findUnique.mockResolvedValue(null);

        await expect(service.marcarComoLida(1, 7, usuarioFabricoId)).rejects.toThrow(
            new NotFoundException("Notificação não encontrada"),
        );
        expect(prisma.notificacaoDestinatario.update).not.toHaveBeenCalled();
    });

    it("rejeita marcar como lida se a notificação for de outro fabrico", async () => {
        prisma.notificacaoDestinatario.findUnique.mockResolvedValue({
            id: 5,
            lida_em: null,
            notificacao: { fabrico_id: 99 },
        });

        await expect(service.marcarComoLida(1, 7, usuarioFabricoId)).rejects.toThrow(
            new NotFoundException("Notificação não encontrada"),
        );
        expect(prisma.notificacaoDestinatario.update).not.toHaveBeenCalled();
    });

    it("traduz validação Prisma no create", async () => {
        prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });
        prisma.usuario.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        prisma.notificacao.create.mockRejectedValue(
            new PrismaClientValidationError("invalid", { clientVersion: "7.0.0" }),
        );

        await expect(service.create(createDto, usuarioFabricoId)).rejects.toThrow(
            new BadRequestException("Dados inválidos"),
        );
    });
});
