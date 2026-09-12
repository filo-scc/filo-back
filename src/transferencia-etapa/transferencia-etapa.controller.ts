import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { TransferirEtapaDto } from "./dto/transferir-etapa.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { TransferenciaEtapaService } from "./transferencia-etapa.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("fichas-tecnicas")
export class TransferenciaEtapaController {
    constructor(private readonly transferenciaEtapaService: TransferenciaEtapaService) {}

    @Post("transferir-etapa")
    transferir(@Body() dto: TransferirEtapaDto, @Req() req: Request) {
        return this.transferenciaEtapaService.transferir(dto, (req as any).user.fabrico_id);
    }
}
