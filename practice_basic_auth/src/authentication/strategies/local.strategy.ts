import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AccountLockoutService } from '../services/account-lockout.service';
import { SecurityService } from '../services/security.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(
        private userService: UsersService,
        private accountLockoutService: AccountLockoutService,
        private securityService: SecurityService
    ) {
        super({
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true // Enable access to request object
        });
    }

    async validate(req: any, email: string, password: string) {
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent');

        // Step 1: Check if IP is blocked
        if (this.securityService.isIPBlocked(ipAddress)) {
            throw new ForbiddenException('Access denied: suspicious activity detected');
        }

        // Step 2: Check rate limiting for login attempts
        const rateLimitCheck = await this.securityService.checkRateLimit(ipAddress, 'login');
        if (!rateLimitCheck.allowed) {
            throw new ForbiddenException('Too many login attempts. Please try again later.');
        }

        // Step 3: Check account lockout status
        const lockoutStatus = await this.accountLockoutService.isAccountLocked(email);
        if (lockoutStatus.isLocked) {
            const remainingTime = lockoutStatus.lockoutExpiresAt
                ? Math.ceil((lockoutStatus.lockoutExpiresAt.getTime() - Date.now()) / (60 * 1000))
                : 0;

            throw new ForbiddenException(
                `Account is locked due to multiple failed login attempts. Try again in ${remainingTime} minutes.`
            );
        }

        // Step 4: Find user and validate credentials
        const user = await this.userService.findByEmail(email);

        if (!user || !user.passwords || user.passwords.length === 0) {
            // Record failed attempt
            await this.accountLockoutService.recordFailedAttempt(
                email,
                ipAddress,
                userAgent,
                'USER_NOT_FOUND'
            );
            throw new UnauthorizedException('Invalid email or password');
        }

        // Step 5: Check if user is active
        if (!user.isActive) {
            await this.accountLockoutService.recordFailedAttempt(
                email,
                ipAddress,
                userAgent,
                'ACCOUNT_INACTIVE'
            );
            throw new UnauthorizedException('Account is inactive');
        }

        // Step 6: Validate password
        const activePassword = user.passwords[0];
        const isPasswordValid = await bcrypt.compare(password, activePassword.hash);

        if (!isPasswordValid) {
            // Record failed attempt and check for lockout
            const newLockoutStatus = await this.accountLockoutService.recordFailedAttempt(
                email,
                ipAddress,
                userAgent,
                'INVALID_PASSWORD'
            );

            // Check for brute force patterns
            const isBruteForce = await this.securityService.detectBruteForceAttack(ipAddress);
            if (isBruteForce) {
                await this.securityService.blockSuspiciousIP(
                    ipAddress,
                    'Brute force attack detected',
                    60 * 60 * 1000 // 1 hour
                );
            }

            // Return appropriate error message
            if (newLockoutStatus.isLocked) {
                const remainingTime = newLockoutStatus.lockoutExpiresAt
                    ? Math.ceil((newLockoutStatus.lockoutExpiresAt.getTime() - Date.now()) / (60 * 1000))
                    : 0;

                throw new ForbiddenException(
                    `Account locked due to multiple failed attempts. Try again in ${remainingTime} minutes.`
                );
            }

            throw new UnauthorizedException('Invalid email or password');
        }

        // Step 7: Successful login - record it and reset lockout
        await this.accountLockoutService.recordSuccessfulLogin(email, ipAddress, userAgent);

        // Step 8: Analyze for suspicious activity (but don't block successful logins)
        await this.securityService.analyzeSuspiciousActivity(ipAddress, userAgent, 'login');

        // Step 9: Update last login (this is now handled in recordSuccessfulLogin)
        // await this.userService.updateLastLogin(user.id); // Remove duplicate call

        // Return user without password data
        const { passwords, ...userWithoutPasswords } = user;
        return userWithoutPasswords;
    }
}