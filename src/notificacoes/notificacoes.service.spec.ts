import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { NotificacoesService } from "./notificacoes.service";

const { PrismaClientKnownRequestError, PrismaClientValidationError } = Prisma;

describe("NotificacoesService", () => {
    let service: NotificacoesService;
    let prisma: any;

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
            notificacao: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
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
        prisma.notificacao.create.mockResolvedValue({ id: 1, titulo: "Pedido atrasado" });

        await expect(service.create(createDto)).resolves.toEqual({
            message: "Notificação criada com sucesso",
            data: { id: 1, titulo: "Pedido atrasado" },
        });
        expect(prisma.notificacao.create).toHaveBeenCalled();
    });

    it("rejeita create sem fabrico", async () => {
        prisma.fabrico.findUnique.mockResolvedValue(null);

        await expect(service.create(createDto)).rejects.toThrow(
            new NotFoundException("Fabrico não encontrado"),
        );
    });

    it("traduz FK inválida no create", async () => {
        prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });
        prisma.notificacao.create.mockRejectedValue(
            new PrismaClientKnownRequestError("fk", {
                code: "P2003",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.create(createDto)).rejects.toThrow(
            new BadRequestException("Destinatário ou referência inválida"),
        );
    });

    it("lista notificações", async () => {
        prisma.notificacao.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
        expect(prisma.notificacao.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { ocorreu_em: "desc" } }),
        );
    });

    it("lista notificações por fabrico", async () => {
        prisma.notificacao.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAllByFabricoID(10)).resolves.toEqual([{ id: 1 }]);
        expect(prisma.notificacao.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { fabrico_id: 10 },
                orderBy: { ocorreu_em: "desc" },
            }),
        );
    });

    it("busca notificação existente", async () => {
        prisma.notificacao.findUnique.mockResolvedValue({ id: 1 });

        await expect(service.findOne(1)).resolves.toEqual({ id: 1 });
    });

    it("rejeita notificação inexistente", async () => {
        prisma.notificacao.findUnique.mockResolvedValue(null);

        await expect(service.findOne(1)).rejects.toThrow(
            new NotFoundException("Notificação não encontrada"),
        );
    });

    it("atualiza notificação existente", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1 } as any);
        prisma.notificacao.update.mockResolvedValue({ id: 1, titulo: "Novo título" });

        await expect(service.update(1, { titulo: "Novo título" })).resolves.toEqual({
            message: "Notificação atualizada com sucesso",
            data: { id: 1, titulo: "Novo título" },
        });
    });

    it("remove notificação existente", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1 } as any);
        prisma.notificacao.delete.mockResolvedValue({ id: 1 });

        await expect(service.remove(1)).resolves.toEqual({
            message: "Notificação removida com sucesso",
            data: { id: 1 },
        });
    });

    it("lista notificações do usuário logado", async () => {
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

        await expect(service.findMine(7)).resolves.toEqual([
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
                where: { destinatarios: { some: { usuario_id: 7 } } },
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
        });
        prisma.notificacaoDestinatario.update.mockResolvedValue({
            id: 5,
            lida_em: new Date("2026-08-28T12:00:00.000Z"),
            notificacao: { id: 1 },
        });

        await expect(service.marcarComoLida(1, 7)).resolves.toEqual({
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
        });
        prisma.notificacaoDestinatario.update.mockResolvedValue({
            id: 5,
            lida_em: lidaEm,
            notificacao: { id: 1 },
        });

        await service.marcarComoLida(1, 7);

        expect(prisma.notificacaoDestinatario.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { lida_em: lidaEm },
            }),
        );
    });

    it("rejeita marcar como lida se o usuário não for destinatário", async () => {
        prisma.notificacaoDestinatario.findUnique.mockResolvedValue(null);

        await expect(service.marcarComoLida(1, 7)).rejects.toThrow(
            new NotFoundException("Notificação não encontrada"),
        );
        expect(prisma.notificacaoDestinatario.update).not.toHaveBeenCalled();
    });

    it("traduz validação Prisma no create", async () => {
        prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });
        prisma.notificacao.create.mockRejectedValue(
            new PrismaClientValidationError("invalid", { clientVersion: "7.0.0" }),
        );

        await expect(service.create(createDto)).rejects.toThrow(
            new BadRequestException("Dados inválidos"),
        );
    });
});
