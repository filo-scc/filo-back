import { NotFoundException } from "@nestjs/common";
import { supabase } from "src/common/libs/supabase";
import { UploadService } from "./upload-photos-supabase";

jest.mock("src/common/libs/supabase", () => ({
    supabase: { storage: { from: jest.fn() } },
}));

describe("UploadService", () => {
    const prisma = {
        fabrico: {
            findFirst: jest.fn(),
        },
    };
    const upload = jest.fn();
    const getPublicUrl = jest.fn();
    const file = {
        originalname: "foto.png",
        mimetype: "image/png",
        buffer: Buffer.from("imagem"),
    } as Express.Multer.File;

    let service: UploadService;

    beforeEach(() => {
        service = new UploadService(prisma as any);
        jest.clearAllMocks();
        jest.spyOn(supabase.storage, "from").mockReturnValue({ upload, getPublicUrl } as any);
        upload.mockResolvedValue({ data: { path: "destino/foto.png" }, error: null });
        getPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn/foto.png" } });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("valida o fábrico ativo antes de gravar no namespace do tenant", async () => {
        prisma.fabrico.findFirst.mockResolvedValue({ id: 5 });

        const resultado = await service.uploadImagem(file, 5);

        expect(prisma.fabrico.findFirst).toHaveBeenCalledWith({
            where: { id: 5, ativo: true },
            select: { id: true },
        });
        expect(upload).toHaveBeenCalledWith(
            expect.stringMatching(/^5\//),
            file.buffer,
            expect.objectContaining({ contentType: "image/png" }),
        );
        expect(resultado.fabrico_id).toBe(5);
    });

    it("rejeita destino inexistente ou inativo", async () => {
        prisma.fabrico.findFirst.mockResolvedValue(null);

        await expect(service.uploadImagem(file, 99)).rejects.toThrow(NotFoundException);
        expect(upload).not.toHaveBeenCalled();
    });

    it("grava upload global de admin sem consultar um tenant", async () => {
        const resultado = await service.uploadImagem(file, "admin");

        expect(prisma.fabrico.findFirst).not.toHaveBeenCalled();
        expect(upload).toHaveBeenCalledWith(
            expect.stringMatching(/^admin\//),
            file.buffer,
            expect.any(Object),
        );
        expect(resultado.fabrico_id).toBeNull();
    });
});
