import { ArgumentsHost, Catch, ExceptionFilter, PayloadTooLargeException } from "@nestjs/common";
import { Response } from "express";

const MENSAGEM_ARQUIVO_GRANDE = "Arquivo muito grande. O tamanho máximo é 5 MB.";

@Catch(PayloadTooLargeException)
export class MulterExceptionFilter implements ExceptionFilter {
    catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<Response>();
        const httpException = new PayloadTooLargeException(MENSAGEM_ARQUIVO_GRANDE);
        const status = httpException.getStatus();
        const body = httpException.getResponse();

        return response
            .status(status)
            .json(typeof body === "string" ? { statusCode: status, message: body } : body);
    }
}
