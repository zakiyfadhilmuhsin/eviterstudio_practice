import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from "src/users/users.service";
import { SessionService } from "../services/session.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private usersService: UsersService,
        private sessionService: SessionService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
            passReqToCallback: true // Enable access to request object
        })
    }

    async validate(req: any, payload: any) {
        // Extract token from Authorization header
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            throw new UnauthorizedException('Token not found');
        }

        // Validate user exists
        const user = await this.usersService.findById(payload.sub);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Check if user account is active
        if (!user.isActive) {
            throw new UnauthorizedException('Account is deactivated');
        }

        // Check if email is verified
        if (!user.isVerified) {
            throw new UnauthorizedException({
                message: 'Email verification required',
                code: 'EMAIL_NOT_VERIFIED',
                details: 'Please verify your email address to continue'
            });
        }

        // Validate session exists in database
        const isSessionValid = await this.sessionService.validateSession(token);
        if (!isSessionValid) {
            throw new UnauthorizedException('Session expired or invalid');
        }

        // Update session activity
        await this.sessionService.updateSessionActivity(token);

        return user; // Ini akan masuk ke req.user di controller
    }
}