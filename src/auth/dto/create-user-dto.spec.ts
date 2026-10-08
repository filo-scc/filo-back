import "reflect-metadata";
import { Cargo } from "@prisma/client";
import { validate } from "class-validator";
import { CreateUserDto } from "./create-user-dto";

describe("CreateUserDto", () => {
    const dadosValidos = {
        email: "usuario@filo.com",
        nome: "Usuário",
        senha: "senha_forte",
        cargo: Cargo.GERENTE,
    };

    it("deve aceitar usuário de negócio sem fabrico_id para derivação pelo serviço", async () => {
        const dto = Object.assign(new CreateUserDto(), dadosValidos);

        await expect(validate(dto)).resolves.toEqual([]);
    });

    it("deve rejeitar fabrico_id inválido quando o campo for informado", async () => {
        const dto = Object.assign(new CreateUserDto(), dadosValidos, {
            fabrico_id: "outro-fabrico",
        });

        const erros = await validate(dto);

        expect(erros).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    property: "fabrico_id",
                    constraints: expect.objectContaining({ isNumber: expect.any(String) }),
                }),
            ]),
        );
    });
});
