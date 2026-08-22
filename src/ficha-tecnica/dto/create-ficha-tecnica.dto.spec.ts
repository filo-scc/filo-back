import { validate } from "class-validator";
import { CreateFichaTecnicaDto } from "./create-ficha-tecnica.dto";
import { UpdateFichaTecnicaDto } from "./update-ficha-tecnica.dto";

const dadosValidos = {
    produto_id: 1,
    concluida: false,
    pedido_id: 1,
    quantidade: 10,
};

describe("contadores de perdas da ficha técnica", () => {
    it.each(["defeitos_costura", "defeitos_tecido", "retiradas", "sobras"] as const)(
        "rejeita %s negativo na criação",
        async (campo) => {
            const dto = Object.assign(new CreateFichaTecnicaDto(), dadosValidos, { [campo]: -1 });

            const erros = await validate(dto);

            expect(erros.some((erro) => erro.property === campo)).toBe(true);
        },
    );

    it("aceita contadores iguais a zero", async () => {
        const dto = Object.assign(new CreateFichaTecnicaDto(), dadosValidos, {
            defeitos_costura: 0,
            defeitos_tecido: 0,
            retiradas: 0,
            sobras: 0,
        });

        await expect(validate(dto)).resolves.toEqual([]);
    });

    it("propaga a restrição para o DTO de atualização", async () => {
        const dto = Object.assign(new UpdateFichaTecnicaDto(), { sobras: -1 });

        const erros = await validate(dto);

        expect(erros.some((erro) => erro.property === "sobras")).toBe(true);
    });
});
