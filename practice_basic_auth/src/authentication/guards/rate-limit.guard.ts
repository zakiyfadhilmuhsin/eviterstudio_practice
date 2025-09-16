import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityService } from '../services/security.service';

export interface RateLimitOptions {
    endpoint: 'global' | 'auth' | 'login' | 'register' | 'password' | 'sensitive';
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}

export const RATE_LIMIT_KEY = 'rateLimit';

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private securityService: SecurityService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!rateLimitOptions) {
            return true; // No rate limiting configured
        }

        const request = context.switchToHttp().getRequest();
        const ipAddress = request.ip || request.connection?.remoteAddress || 'unknown';

        // Check if IP is blocked for suspicious activity
        if (this.securityService.isIPBlocked(ipAddress)) {
            throw new ForbiddenException('Access denied: suspicious activity detected');
        }

        // Check rate limit
        const rateLimitCheck = await this.securityService.checkRateLimit(
            ipAddress,
            rateLimitOptions.endpoint
        );

        if (!rateLimitCheck.allowed) {
            const resetTime = rateLimitCheck.resetTime ? new Date(rateLimitCheck.resetTime) : new Date();
            const waitTime = Math.ceil((resetTime.getTime() - Date.now()) / 1000);

            throw new ForbiddenException(
                `Rate limit exceeded for ${rateLimitOptions.endpoint}. Try again in ${waitTime} seconds.`
            );
        }

        // Add rate limit info to response headers
        const response = context.switchToHttp().getResponse();
        response.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining || 0);
        response.setHeader('X-RateLimit-Reset', rateLimitCheck.resetTime || Date.now());

        return true;
    }
}