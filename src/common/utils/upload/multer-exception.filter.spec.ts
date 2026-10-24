import { ArgumentsHost, HttpStatus, PayloadTooLargeException } from "@nestjs/common";
import { MulterExceptionFilter } from "./multer-exception.filter";

describe("MulterExceptionFilter", () => {
    const filter = new MulterExceptionFilter();

    const createHost = () => {
        const json = jest.fn();
        const status = jest.fn().mockReturnValue({ json });
        const host = {
            switchToHttp: () => ({
                getResponse: () => ({ status }),
            }),
        } as unknown as ArgumentsHost;

        return { host, status, json };
    };

    it("substitui a mensagem em inglês do Nest/Multer por português", () => {
        const { host, status, json } = createHost();
        const error = new PayloadTooLargeException("File too large");

        filter.catch(error, host);

        expect(status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
                message: "Arquivo muito grande. O tamanho máximo é 5 MB.",
            }),
        );
    });
});
