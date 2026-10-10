import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA } from "@nestjs/common/constants";
import { FichaEtapaController } from "./ficha-etapa.controller";

describe("FichaEtapaController", () => {
    it("não expõe criação de histórico: ele só é aberto pela transferência de etapa", () => {
        const metodosHttp = Object.getOwnPropertyNames(FichaEtapaController.prototype)
            .filter((nome) => nome !== "constructor")
            .map((nome) =>
                Reflect.getMetadata(METHOD_METADATA, FichaEtapaController.prototype[nome]),
            );

        expect(metodosHttp.length).toBeGreaterThan(0);
        expect(metodosHttp).not.toContain(RequestMethod.POST);
    });
});
