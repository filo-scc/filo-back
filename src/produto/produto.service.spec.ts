import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ProdutoController } from "./produto.controller";
import { ProdutoService } from "./produto.service";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateProdutoDto } from "./dto/create-produto.dto";
import { UpdateProduto } from "./dto/update-produto.dto";

describe("ProdutoController", () => {
    let controller: ProdutoController;
    let service: jest.Mocked<ProdutoService>;

    const mockUser = {
        id: 1,
        email: "user@test.com",
        fabrico_id: 10,
        role: "PROPRIETARIO",
    } as unknown as AuthenticatedUser;

    const mockUserSemFabrico = {
        id: 2,
        email: "user2@test.com",
        role: "PROPRIETARIO",
    } as unknown as AuthenticatedUser;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProdutoController],
            providers: [
                {
                    provide: ProdutoService,
                    useValue: {
                        create: jest.fn(),
                        findAll: jest.fn(),
                        findAllFabrico: jest.fn(),
                        getById: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                        getUnassociatedProductsForClient: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<ProdutoController>(ProdutoController);
        service = module.get(ProdutoService);
    });

    it("deve lançar NotFoundException se o usuário não possuir fabrico_id", () => {
        expect(() => controller.findAll(mockUserSemFabrico)).toThrow(
            new NotFoundException("Fabrico não encontrado"),
        );
    });

    describe("create", () => {
        it("deve chamar service.create com os dados e o fabrico_id do usuário", async () => {
            const dto: CreateProdutoDto = { nome: "Camiseta", fabrico_id: 10 } as any;
            service.create.mockResolvedValue({ id: 1, ...dto } as any);

            const result = await controller.create(dto, mockUser);

            expect(service.create).toHaveBeenCalledWith(dto, 10);
            expect(result).toEqual({ id: 1, ...dto });
        });
    });

    describe("findAll", () => {
        it("deve chamar service.findAll com o fabrico_id do usuário", async () => {
            service.findAll.mockResolvedValue([]);

            await controller.findAll(mockUser);

            expect(service.findAll).toHaveBeenCalledWith(10);
        });
    });

    describe("findAllFabrico", () => {
        it("deve retornar produtos se fabrico_id corresponder ao do usuário", async () => {
            service.findAllFabrico.mockResolvedValue([]);

            await controller.findAllFabrico(10, mockUser);

            expect(service.findAllFabrico).toHaveBeenCalledWith(10);
        });

        it("deve lançar NotFoundException se fabrico_id da rota for diferente do usuário", () => {
            expect(() => controller.findAllFabrico(99, mockUser)).toThrow(
                new NotFoundException("Fabrico não encontrado"),
            );
        });
    });

    describe("getById", () => {
        it("deve chamar service.getById com id e fabrico_id", async () => {
            service.getById.mockResolvedValue({ id: 1, nome: "Camiseta" } as any);

            await controller.getById(1, mockUser);

            expect(service.getById).toHaveBeenCalledWith(1, 10);
        });
    });

    describe("update", () => {
        it("deve chamar service.update com id, DTO e fabrico_id", async () => {
            const dto: UpdateProduto = { nome: "Camiseta Polo" };
            service.update.mockResolvedValue("O produto com o id 1 foi atualizado");

            const result = await controller.update(1, dto, mockUser);

            expect(service.update).toHaveBeenCalledWith(1, dto, 10);
            expect(result).toBe("O produto com o id 1 foi atualizado");
        });
    });

    describe("delete", () => {
        it("deve chamar service.delete com id e fabrico_id", async () => {
            service.delete.mockResolvedValue("O produto com o id 1 foi deletado com sucesso");

            const result = await controller.delete(1, mockUser);

            expect(service.delete).toHaveBeenCalledWith(1, 10);
            expect(result).toBe("O produto com o id 1 foi deletado com sucesso");
        });
    });

    describe("getUnassociatedProductsForClient", () => {
        it("deve chamar service com cliente_id e fabrico_id do usuário", async () => {
            service.getUnassociatedProductsForClient.mockResolvedValue([]);

            await controller.getUnassociatedProductsForClient(5, mockUser);

            expect(service.getUnassociatedProductsForClient).toHaveBeenCalledWith(5, 10);
        });

        it("deve lançar NotFoundException se o usuário não possuir fabrico_id", () => {
            expect(() =>
                controller.getUnassociatedProductsForClient(5, mockUserSemFabrico),
            ).toThrow(new NotFoundException("Fabrico não encontrado"));
        });
    });
});
