import { Cargo } from "@prisma/client";
import { UploadController } from "./upload.controller";

jest.mock("src/common/libs/supabase", () => ({
    supabase: { storage: { from: jest.fn() } },
}));

describe("UploadController", () => {
    const uploadService = {
        uploadImagem: jest.fn(),
    };

    const file = { originalname: "foto.png" } as Express.Multer.File;
    const proprietario = {
        cargo: Cargo.PROPRIETARIO,
        fabrico_id: 1,
        fabrico: { id: 1, ativo: true },
    } as any;
    const admin = {
        cargo: Cargo.ADMIN,
        fabrico_id: null,
        fabrico: null,
    } as any;

    let controller: UploadController;

    beforeEach(() => {
        controller = new UploadController(uploadService as any);
        jest.clearAllMocks();
    });

    it("ignora o fabrico_id enviado por usuário de negócio", async () => {
        uploadService.uploadImagem.mockResolvedValue({ path: "1/foto.png" });

        await controller.upload(file, proprietario, { fabrico_id: 99 });

        expect(uploadService.uploadImagem).toHaveBeenCalledWith(file, 1);
    });

    it("permite que administrador selecione um fábrico", async () => {
        uploadService.uploadImagem.mockResolvedValue({ path: "2/foto.png" });

        await controller.upload(file, admin, { fabrico_id: 2 });

        expect(uploadService.uploadImagem).toHaveBeenCalledWith(file, 2);
    });

    it("usa o namespace administrativo quando o admin não seleciona fábrico", async () => {
        uploadService.uploadImagem.mockResolvedValue({ path: "admin/foto.png" });

        await controller.upload(file, admin, {});

        expect(uploadService.uploadImagem).toHaveBeenCalledWith(file, "admin");
    });
});
