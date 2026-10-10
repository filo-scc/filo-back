import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { FichaEtapaController } from "./ficha-etapa.controller";

describe("FichaEtapaController", () => {
    const rotas = Object.getOwnPropertyNames(FichaEtapaController.prototype)
        .filter((nome) => nome !== "constructor")
        .map((nome) => ({
            metodo: Reflect.getMetadata(METHOD_METADATA, FichaEtapaController.prototype[nome]),
            caminho: String(
                Reflect.getMetadata(PATH_METADATA, FichaEtapaController.prototype[nome]),
            ),
        }));

    it("expõe rotas de histórico", () => {
        expect(rotas.length).toBeGreaterThan(0);
    });

    it("não cria histórico: ele só é aberto pela transferência de etapa", () => {
        expect(rotas.map((rota) => rota.metodo)).not.toContain(RequestMethod.POST);
    });

    it("não apaga histórico nem encerra etapa: o histórico só muda junto com a etapa da ficha", () => {
        expect(rotas.map((rota) => rota.metodo)).not.toContain(RequestMethod.DELETE);
        expect(rotas.filter((rota) => rota.caminho.includes("finalizar"))).toEqual([]);
    });
});
