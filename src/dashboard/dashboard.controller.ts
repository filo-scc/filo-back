import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { DashboardService } from "./dashboard.service";
import { ProductionSeriesQueryDto } from "./dto/production-series-query.dto";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get("resumo-operacional")
    getOperationalSummary(@Req() req: Request) {
        return this.dashboardService.getOperationalSummary((req as any).user.fabrico_id);
    }

    @Get("serie-producao")
    getProductionSeries(@Query() query: ProductionSeriesQueryDto, @Req() req: Request) {
        return this.dashboardService.getProductionSeries(
            (req as any).user.fabrico_id,
            query.periodo,
            query.quantidade,
        );
    }
}
