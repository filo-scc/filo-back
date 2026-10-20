import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

export const MSG_FICHA_CONCLUIDA = "Não é permitido alterar uma ficha já concluída";
export const MSG_MATRIZ_CONCLUIDA =
    "Não é permitido editar itens de matriz de uma ficha já concluída";

export type ItemMatriz = {
    cor_id: number | string;
    grade_versao_item_id: number | string;
    quantidade?: number | string | null;
};

export type FichaParaValidar = {
    concluida: boolean;
    pedido_id?: number | null;
    quantidade?: number | null;
    observacoes?: string | null;
    grade_versao_id?: number | null;
    etapa_atual_id?: number | null;
    defeitos_costura?: number | null;
    defeitos_tecido?: number | null;
    retiradas?: number | null;
    sobras?: number | null;
    ficha_tecnica_itens?: ItemMatriz[];
    ficha_parceiro?: { parceiro_id: number; operacao?: string | null }[];
};

export type PayloadFicha = {
    pedido_id?: number | null;
    quantidade?: number | string | null;
    observacoes?: string | null;
    grade_versao_id?: number | string | null;
    etapa_atual_id?: number | string | null;
    defeitos_costura?: number | null;
    defeitos_tecido?: number | null;
    retiradas?: number | null;
    sobras?: number | null;
    itens?: ItemMatriz[];
    cores_ids?: (number | string)[];
    parceiros?: { parceiro_id: number | string; operacao?: string | null; preco?: unknown }[];
    preco_padrao?: unknown;
};

/**
 * Preços vivem fora da ficha (ParceiroProduto e ClienteProduto), então quem
 * chama passa o valor gravado. Contexto ausente = aquele preço não é comparado.
 */
export type ContextoPrecos = {
    /** parceiro_id -> preço gravado em ParceiroProduto do produto da ficha */
    precoParceiro?: Map<number, Prisma.Decimal | null>;
    /** preço gravado em ClienteProduto (null = sem preço); undefined = não comparar */
    precoPadraoCliente?: Prisma.Decimal | null;
};

// Campos de produção ainda bloqueados em ficha concluída. A task não os lista:
// confirme com o produto. Esvazie o array se perdas/etapa devem ficar liberadas.
const CAMPOS_PRODUCAO_BLOQUEADOS = [
    "defeitos_costura",
    "defeitos_tecido",
    "retiradas",
    "sobras",
] as const;

const num = (valor: unknown) => Number(valor) || 0;
const chave = (cor: number | string, grade: number | string) => `${Number(cor)}-${Number(grade)}`;

export function mesmoPreco(a: unknown, b: unknown): boolean {
    const pa = a === null || a === undefined || a === "" ? null : new Prisma.Decimal(a as any);
    const pb = b === null || b === undefined || b === "" ? null : new Prisma.Decimal(b as any);

    if (pa === null || pb === null) {
        return pa === null && pb === null;
    }

    return pa.equals(pb);
}

/**
 * Compara a matriz gravada com a proposta de forma normalizada:
 * - conjunto de cores efetivo (cores dos itens + cores_ids) contra as cores gravadas;
 * - quantidade por cor-tamanho, com célula ausente valendo 0 nos dois lados
 *   (o banco guarda uma linha por cor x tamanho, o front pode mandar só as preenchidas).
 */
export function matrizEquivalente(
    atual: ItemMatriz[],
    proposta: ItemMatriz[],
    coresExtras: (number | string)[] = [],
): boolean {
    const coresAtual = new Set(atual.map((i) => Number(i.cor_id)));
    const coresProposta = new Set([
        ...proposta.map((i) => Number(i.cor_id)),
        ...coresExtras.map(Number),
    ]);

    if (coresAtual.size !== coresProposta.size) return false;
    for (const corId of coresProposta) {
        if (!coresAtual.has(corId)) return false;
    }

    const mapear = (itens: ItemMatriz[]) =>
        new Map(itens.map((i) => [chave(i.cor_id, i.grade_versao_item_id), num(i.quantidade)]));

    const a = mapear(atual);
    const p = mapear(proposta);

    for (const k of new Set([...a.keys(), ...p.keys()])) {
        if ((a.get(k) ?? 0) !== (p.get(k) ?? 0)) return false;
    }

    return true;
}

function fichaMudou(
    fichaDb: FichaParaValidar,
    payload: PayloadFicha,
    contexto: ContextoPrecos,
): boolean {
    // Campo omitido (undefined) = mantém o valor gravado, nunca conta como mudança.
    if (payload.quantidade !== undefined && num(payload.quantidade) !== num(fichaDb.quantidade)) {
        return true;
    }

    if (
        payload.observacoes !== undefined &&
        (payload.observacoes ?? "") !== (fichaDb.observacoes ?? "")
    ) {
        return true;
    }

    if (
        payload.grade_versao_id != null &&
        Number(payload.grade_versao_id) !== Number(fichaDb.grade_versao_id)
    ) {
        return true;
    }

    if (
        payload.pedido_id !== undefined &&
        (payload.pedido_id ?? null) !== (fichaDb.pedido_id ?? null)
    ) {
        return true;
    }

    if (
        payload.etapa_atual_id !== undefined &&
        (payload.etapa_atual_id == null ? null : Number(payload.etapa_atual_id)) !==
            (fichaDb.etapa_atual_id ?? null)
    ) {
        return true;
    }

    for (const campo of CAMPOS_PRODUCAO_BLOQUEADOS) {
        if (payload[campo] !== undefined && num(payload[campo]) !== num(fichaDb[campo])) {
            return true;
        }
    }

    // Matriz (itens e/ou cores_ids)
    const temMatriz = Array.isArray(payload.itens) || Array.isArray(payload.cores_ids);

    if (
        temMatriz &&
        !matrizEquivalente(
            fichaDb.ficha_tecnica_itens ?? [],
            payload.itens ?? [],
            payload.cores_ids ?? [],
        )
    ) {
        return true;
    }

    // Parceiros: vínculo, operação e preço
    if (Array.isArray(payload.parceiros)) {
        const doBanco = fichaDb.ficha_parceiro ?? [];

        if (payload.parceiros.length !== doBanco.length) {
            return true;
        }

        const operacaoPorParceiro = new Map(
            doBanco.map((p) => [Number(p.parceiro_id), p.operacao ?? ""]),
        );

        for (const parceiro of payload.parceiros) {
            const parceiroId = Number(parceiro.parceiro_id);
            const operacaoDb = operacaoPorParceiro.get(parceiroId);

            if (operacaoDb === undefined || (parceiro.operacao ?? "") !== operacaoDb) {
                return true;
            }

            if (
                parceiro.preco !== undefined &&
                contexto.precoParceiro &&
                !mesmoPreco(parceiro.preco, contexto.precoParceiro.get(parceiroId) ?? null)
            ) {
                return true;
            }
        }
    }

    // Preço padrão do cliente
    if (
        payload.preco_padrao !== undefined &&
        contexto.precoPadraoCliente !== undefined &&
        !mesmoPreco(payload.preco_padrao, contexto.precoPadraoCliente)
    ) {
        return true;
    }

    return false;
}

/** Só ficha com concluida = true é imutável. Eco idêntico passa; qualquer diferença dá 409. */
export function assertFichaEditavel(
    fichaDb: FichaParaValidar,
    payload: PayloadFicha,
    contexto: ContextoPrecos = {},
) {
    if (!fichaDb.concluida) return;

    if (fichaMudou(fichaDb, payload, contexto)) {
        throw new ConflictException(MSG_FICHA_CONCLUIDA);
    }
}

/** Usado pelos endpoints de matriz: ficha concluída só aceita operação que não muda nada. */
export function assertMatrizSemMudanca(ficha: { concluida: boolean }, houveMudanca: boolean) {
    if (ficha.concluida && houveMudanca) {
        throw new ConflictException(MSG_MATRIZ_CONCLUIDA);
    }
}
