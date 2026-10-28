import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { TransferirEtapaDto } from "./transferir-etapa.dto";

const validar = async (corpo: Record<string, unknown>) =>
    validate(plainToInstance(TransferirEtapaDto, corpo), {
        whitelist: true,
        forbidNonWhitelisted: false,
    });

const camposInvalidos = (erros: Awaited<ReturnType<typeof validar>>) =>
    erros.map((erro) => erro.property);

describe("TransferirEtapaDto", () => {
    const base = { ficha_tecnica_id: 10, etapa_destino_id: 2 };

    it("aceita origem inteira", async () => {
        expect(await validar({ ...base, etapa_origem_id: 1 })).toHaveLength(0);
    });

    it("aceita origem null explícita (ficha sem etapa)", async () => {
        expect(await validar({ ...base, etapa_origem_id: null })).toHaveLength(0);
    });

    it("rejeita origem omitida: ausência não significa ficha sem etapa", async () => {
        expect(camposInvalidos(await validar(base))).toContain("etapa_origem_id");
    });

    it.each([
        ["texto", "1"],
        ["decimal", 1.5],
        ["booleano", false],
        ["string vazia", ""],
    ])("rejeita origem inválida (%s)", async (_nome, valor) => {
        expect(camposInvalidos(await validar({ ...base, etapa_origem_id: valor }))).toContain(
            "etapa_origem_id",
        );
    });

    it("destino continua obrigatório e inteiro, mesmo com origem null", async () => {
        expect(
            camposInvalidos(await validar({ ficha_tecnica_id: 10, etapa_origem_id: null })),
        ).toContain("etapa_destino_id");
        expect(
            camposInvalidos(
                await validar({ ...base, etapa_origem_id: null, etapa_destino_id: null }),
            ),
        ).toContain("etapa_destino_id");
    });
});
