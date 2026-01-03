import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload, CurrentUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        const secretOrKey = configService.get<string>('JWT_SECRET');
        if (!secretOrKey) {
            throw new Error('JWT_SECRET environment variable is not set');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
