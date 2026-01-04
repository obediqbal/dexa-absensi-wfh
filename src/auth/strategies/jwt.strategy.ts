import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import type { JwtPayload, CurrentUser } from '../interfaces/jwt-payload.interface';

const cookieExtractor = (req: Request): string | null => {
    if (req && req.cookies) {
        return req.cookies['access_token'] || null;
    }
    return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        const secretOrKey = configService.get<string>('JWT_SECRET');
        if (!secretOrKey) {
            throw new Error('JWT_SECRET environment variable is not set');
        }

        super({
            jwtFromRequest: cookieExtractor,
            ignoreExpiration: false,
            secretOrKey,
        });
    }

    validate(payload: JwtPayload): CurrentUser {
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    }
}
