import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { AuthenticatedUser } from "src/auth/types/authenticated-user";

export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}

export const getCurrentUser = (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
};

export const CurrentUser = createParamDecorator<unknown, AuthenticatedUser>(getCurrentUser);
