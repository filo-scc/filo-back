import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const getCurrentUser = (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    return request.usuario;
};

export const CurrentUser = createParamDecorator(getCurrentUser);
