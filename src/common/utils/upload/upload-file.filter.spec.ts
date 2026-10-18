import { BadRequestException } from "@nestjs/common";
import { uploadFileFilter } from "./upload-file.filter";

describe("uploadFileFilter", () => {
    const req = {} as any;

    it("rejeita formatos fora de JPG/PNG/WEBP com BadRequestException", () => {
        const callback = jest.fn();
        const file = { mimetype: "application/pdf" } as Express.Multer.File;

        uploadFileFilter(req, file, callback);

        expect(callback).toHaveBeenCalledTimes(1);
        const [error] = callback.mock.calls[0];
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getResponse()).toEqual(
            expect.objectContaining({
                message: "Formato inválido. Use JPG, PNG ou WEBP.",
                statusCode: 400,
            }),
        );
    });

    it.each(["image/jpeg", "image/png", "image/webp"])("aceita o formato %s", (mimetype) => {
        const callback = jest.fn();
        const file = { mimetype } as Express.Multer.File;

        uploadFileFilter(req, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
    });
});
