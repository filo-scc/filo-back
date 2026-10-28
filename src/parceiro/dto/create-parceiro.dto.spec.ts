import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateParceiroDto } from "./create-parceiro.dto";
import { UpdateParceiroDto } from "./update-parceiro.dto";

async function errosDeEtapaId(
    payload: Record<string, unknown>,
    tipo: new () => object = CreateParceiroDto,
) {
    const dto = plainToInstance(tipo, { nome: "Parceiro", ...payload });
    const erros = await validate(dto);

    return erros.filter((erro) => erro.property === "etapa_id");
}

describe("CreateParceiroDto.etapa_id", () => {
    it.each([[undefined], [null], [1], [42]])("aceita %p", async (valor) => {
        await expect(errosDeEtapaId({ etapa_id: valor })).resolves.toEqual([]);
    });

    it.each([[0], [-3], [1.5], ["5"], [true]])("rejeita %p", async (valor) => {
        await expect(errosDeEtapaId({ etapa_id: valor })).resolves.toHaveLength(1);
    });

    it("herda a validação no UpdateParceiroDto, com null para remover o vínculo", async () => {
        await expect(errosDeEtapaId({ etapa_id: null }, UpdateParceiroDto)).resolves.toEqual([]);
        await expect(errosDeEtapaId({ etapa_id: 0 }, UpdateParceiroDto)).resolves.toHaveLength(1);
    });
});
