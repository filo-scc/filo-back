import { Test, TestingModule } from "@nestjs/testing";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { ProductionSeriesPeriod } from "./dto/production-series-query.dto";

describe("DashboardController", () => {
    let controller: DashboardController;

    const dashboardService = {
        getOperationalSummary: jest.fn(),
        getProductionSeries: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DashboardController],
            providers: [{ provide: DashboardService, useValue: dashboardService }],
        }).compile();

        controller = module.get(DashboardController);
        jest.clearAllMocks();
    });

    it("usa exclusivamente a fábrica do usuário autenticado no resumo", async () => {
        dashboardService.getOperationalSummary.mockResolvedValue({});
        const request = { user: { fabrico_id: 7 } } as any;

        await controller.getOperationalSummary(request);

        expect(dashboardService.getOperationalSummary).toHaveBeenCalledWith(7);
    });

    it("usa a fábrica autenticada e o período validado na série", async () => {
        dashboardService.getProductionSeries.mockResolvedValue({});
        const request = { user: { fabrico_id: 9 } } as any;

        await controller.getProductionSeries(
            { periodo: ProductionSeriesPeriod.YEARLY, quantidade: 10 },
            request,
        );

        expect(dashboardService.getProductionSeries).toHaveBeenCalledWith(
            9,
            ProductionSeriesPeriod.YEARLY,
            10,
        );
    });
});
