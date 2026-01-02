import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser as ICurrentUser } from '../../auth/interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
    (data: keyof ICurrentUser | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as ICurrentUser;

        return data ? user?.[data] : user;
    },
);
