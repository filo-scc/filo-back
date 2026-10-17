import * as bcrypt from "bcrypt";
import { Cargo, TipoCor } from "@prisma/client";
import { PrismaService } from "../src/prisma/prisma.service";

export const runId = `e2e_concorrencia_${Date.now()}_${Math.random().toString(16).slice(2)}`;
export const password = "senha-e2e-123";

export type Fixtures = {
    fabricoId: number;
    email: string;
    tamanhoId: number;
    gradeId: number;
    gradeVersaoId: number;
    gradeVersaoItemId: number;
    clienteId: number;
    produtoId: number;
    corId: number;
    etapas: [
        { id: number; ordem: number },
        { id: number; ordem: number },
        { id: number; ordem: number },
    ];
};

export type PedidoFicha = {
    pedidoId: number;
    fichaId: number;
};

export async function createConcurrencyFixtures(prisma: PrismaService): Promise<Fixtures> {
    const fabrico = await prisma.fabrico.create({
        data: {
            nome_fantasia: `${runId}-fabrico`,
            razao_social: `${runId}-razao`,
            cnpj: `${Date.now()}${Math.floor(Math.random() * 10)}`.slice(0, 14),
        },
    });
    const email = `${runId}@filo.test`;

    await prisma.usuario.create({
        data: {
            email,
            nome: `${runId}-usuario`,
            senha: await bcrypt.hash(password, 10),
            cargo: Cargo.PROPRIETARIO,
            fabrico_id: fabrico.id,
        },
    });

    const cliente = await prisma.cliente.create({
        data: {
            nome: `${runId}-cliente`,
            status: true,
            fabrico_id: fabrico.id,
        },
    });
    const tipoProduto = await prisma.tipoProduto.create({
        data: { nome: `${runId}-tipo`, fabrico_id: fabrico.id },
    });
    const tamanho = await prisma.tamanho.create({
        data: { codigo: `${runId}-P`, ordem_global: Math.floor(Math.random() * 1000000) },
    });
    const grade = await prisma.grade.create({
        data: { nome: `${runId}-grade`, ativo: true },
    });
    const gradeVersao = await prisma.gradeVersao.create({
        data: { grade_id: grade.id, versao: 1, ativo: true },
    });
    await prisma.gradeItem.create({
        data: { grade_id: grade.id, tamanho_id: tamanho.id, posicao: 1 },
    });
    const gradeVersaoItem = await prisma.gradeVersaoItem.create({
        data: { grade_versao_id: gradeVersao.id, tamanho_id: tamanho.id, posicao: 1 },
    });
    await prisma.fabricoGrade.create({
        data: { fabrico_id: fabrico.id, grade_id: grade.id, ativo: true },
    });

    const produto = await prisma.produto.create({
        data: {
            nome: `${runId}-produto`,
            tipo_produto_id: tipoProduto.id,
            fabrico_id: fabrico.id,
            grade_versao_id: gradeVersao.id,
        },
    });
    const cor = await prisma.cor.create({
        data: {
            nome: `${runId}-cor`,
            codigo_hex: "#FFFFFF",
            tipo: TipoCor.COR,
            fabrico_id: fabrico.id,
        },
    });
    const etapas = await Promise.all(
        [1, 2, 3].map((ordem) =>
            prisma.etapa.create({
                data: {
                    nome: `${runId}-etapa-${ordem}`,
                    ordem,
                    ativa: true,
                    fabrico_id: fabrico.id,
                },
                select: { id: true, ordem: true },
            }),
        ),
    );

    return {
        fabricoId: fabrico.id,
        email,
        tamanhoId: tamanho.id,
        gradeId: grade.id,
        gradeVersaoId: gradeVersao.id,
        gradeVersaoItemId: gradeVersaoItem.id,
        clienteId: cliente.id,
        produtoId: produto.id,
        corId: cor.id,
        etapas: etapas as Fixtures["etapas"],
    };
}

let nextPedidoNumber = 1000;
let nextFichaNumber = 1000;

export async function createPedidoFicha(
    prisma: PrismaService,
    fixtures: Fixtures,
    etapaId: number,
    produzidaEm?: Date,
): Promise<PedidoFicha> {
    const pedido = await prisma.pedido.create({
        data: {
            finalizado: false,
            cor: "#FFFFFF",
            quantidade: 0,
            numero: nextPedidoNumber++,
            cliente_id: fixtures.clienteId,
            fabrico_id: fixtures.fabricoId,
        },
    });
    const ficha = await prisma.fichaTecnica.create({
        data: {
            concluida: false,
            quantidade: 0,
            numero: nextFichaNumber++,
            produto_id: fixtures.produtoId,
            grade_versao_id: fixtures.gradeVersaoId,
            etapa_atual_id: etapaId,
            pedido_id: pedido.id,
            fabrico_id: fixtures.fabricoId,
            produzida_em: produzidaEm,
        },
    });
    await prisma.fichaEtapa.create({
        data: {
            ficha_tecnica_id: ficha.id,
            etapa_id: etapaId,
            data_inicio: new Date(Date.now() - 60 * 60 * 1000),
        },
    });

    return { pedidoId: pedido.id, fichaId: ficha.id };
}

export function completePayload(fixtures: Fixtures, idempotencyKey: string) {
    return {
        idempotency_key: idempotencyKey,
        fichas: [
            {
                produto_id: fixtures.produtoId,
                grade_versao_id: fixtures.gradeVersaoId,
                etapa_atual_id: fixtures.etapas[0].id,
                quantidade: 1,
                cores_ids: [fixtures.corId],
                itens: [
                    {
                        cor_id: fixtures.corId,
                        grade_versao_item_id: fixtures.gradeVersaoItemId,
                        quantidade: 1,
                    },
                ],
            },
        ],
    };
}

export async function cleanupConcurrencyFixtures(prisma: PrismaService, fixtures: Fixtures) {
    await prisma.fichaEtapa.deleteMany({
        where: { ficha_tecnica: { fabrico_id: fixtures.fabricoId } },
    });
    await prisma.fichaTecnica.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
    await prisma.pedido.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
    await prisma.produto.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
    await prisma.cor.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
    await prisma.cliente.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
    await prisma.etapa.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
    await prisma.tipoProduto.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
    await prisma.usuario.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
    await prisma.fabricoGrade.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
    await prisma.fabrico.deleteMany({ where: { id: fixtures.fabricoId } });
    await prisma.grade.deleteMany({ where: { id: fixtures.gradeId } });
    await prisma.tamanho.deleteMany({ where: { id: fixtures.tamanhoId } });
}
