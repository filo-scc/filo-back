import { validate } from "class-validator";
import { CreateParceiroProdutoDto } from "./create-parceiroproduto.dto";

describe("CreateParceiroProdutoDto", () => {
    it("aceita preço nulo", async () => {
        const dto = Object.assign(new CreateParceiroProdutoDto(), { preco: null });

        await expect(validate(dto)).resolves.toEqual([]);
    });

    it("continua rejeitando preço zero", async () => {
        const dto = Object.assign(new CreateParceiroProdutoDto(), { preco: 0 });

        const erros = await validate(dto);

        expect(erros).toHaveLength(1);
        expect(erros[0].constraints).toHaveProperty("isPositive");
    });
});
