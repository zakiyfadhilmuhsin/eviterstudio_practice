import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

export interface LockoutConfiguration {
  maxAttempts: number;
  lockoutDuration: number; // in milliseconds
  attemptWindow: number; // in milliseconds
  progressiveLockout: boolean;
}

export interface LockoutStatus {
  isLocked: boolean;
  attemptsRemaining: number;
  lockoutExpiresAt?: Date;
  nextAttemptAllowedAt?: Date;
}

@Injectable()
export class AccountLockoutService {
    private readonly logger = new Logger(AccountLockoutService.name);

    // Default configuration
    private readonly defaultConfig: LockoutConfiguration = {
        maxAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        attemptWindow: 5 * 60 * 1000, // 5 minutes
        progressiveLockout: true
    };

    /**
     * == Table of Contents ==
     * 
     * 1. Get Lockout Configuration
     * 2. Check if Account is Locked
     * 3. Record Failed Login Attempt
     * 4. Record Successful Login
     * 5. Manually Unlock Account
     * 6. Calculate Lockout Duration with Progressive Lockout
     * 7. Get Lockout Statistics
     * 8. Get List of Currently Locked Accounts
     * 
     * ========================================= 
     */
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService
    ) {}

    /**
     * Get lockout configuration from environment or use defaults
     */
    private getConfig(): LockoutConfiguration {
        return {
            maxAttempts: this.configService.get<number>('LOCKOUT_MAX_ATTEMPTS') || this.defaultConfig.maxAttempts,
            lockoutDuration: this.configService.get<number>('LOCKOUT_DURATION') || this.defaultConfig.lockoutDuration,
            attemptWindow: this.configService.get<number>('LOCKOUT_ATTEMPT_WINDOW') || this.defaultConfig.attemptWindow,
            progressiveLockout: this.configService.get<boolean>('LOCKOUT_PROGRESSIVE') ?? this.defaultConfig.progressiveLockout
        };
    }

    /**
     * Check if account is currently locked
     */
    async isAccountLocked(email: string): Promise<LockoutStatus> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                failedLoginAttempts: true,
                lockedAt: true,
                lockoutExpiresAt: true
            }
        });

        if (!user) {
            return {
                isLocked: false,
                attemptsRemaining: this.getConfig().maxAttempts
            };
        }

        const config = this.getConfig();
        const now = new Date();

        // Check if lockout has expired
        if (user.lockoutExpiresAt && user.lockoutExpiresAt <= now) {
            // Unlock the account
            await this.unlockAccount(email);
            return {
                isLocked: false,
                attemptsRemaining: config.maxAttempts
            };
        }

        // Check if account is currently locked
        if (user.lockedAt && user.lockoutExpiresAt && user.lockoutExpiresAt > now) {
            return {
                isLocked: true,
                attemptsRemaining: 0,
                lockoutExpiresAt: user.lockoutExpiresAt
            };
        }

        return {
            isLocked: false,
            attemptsRemaining: Math.max(0, config.maxAttempts - user.failedLoginAttempts)
        };
    }

    /**
     * Record a failed login attempt
     */
    async recordFailedAttempt(
        email: string,
        ipAddress: string,
        userAgent?: string,
        failureReason?: string
    ): Promise<LockoutStatus> {
        const config = this.getConfig();

        // Find or create user record
        let user = await this.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                failedLoginAttempts: true,
                lockedAt: true,
                lockoutExpiresAt: true
            }
        });

        // Log the failed attempt
        await this.prisma.loginAttempt.create({
            data: {
                userId: user?.id,
                email,
                ipAddress,
                userAgent,
                success: false,
                failureReason,
                lockoutTriggered: false
            }
        });

        if (!user) {
            // User doesn't exist, but we don't reveal this for security
            return {
                isLocked: false,
                attemptsRemaining: config.maxAttempts - 1
            };
        }

        // Check if account is already locked and still within lockout period
        const now = new Date();
        if (user.lockoutExpiresAt && user.lockoutExpiresAt > now) {
            return {
                isLocked: true,
                attemptsRemaining: 0,
                lockoutExpiresAt: user.lockoutExpiresAt
            };
        }

        // Increment failed attempts
        const newFailedAttempts = user.failedLoginAttempts + 1;

        // Check if we need to lock the account
        if (newFailedAttempts >= config.maxAttempts) {
            const lockoutDuration = this.calculateLockoutDuration(user.id, config);
            const lockoutExpiresAt = new Date(now.getTime() + await lockoutDuration);

            // Lock the account
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: newFailedAttempts,
                    lockedAt: now,
                    lockoutExpiresAt
                }
            });

            // Update the login attempt to mark it as triggering lockout
            await this.prisma.loginAttempt.updateMany({
                where: {
                    email,
                    ipAddress,
                    createdAt: {
                        gte: new Date(now.getTime() - 1000) // Within last second
                    }
                },
                data: {
                    lockoutTriggered: true
                }
            });

            this.logger.warn(`Account locked for email: ${email}, attempts: ${newFailedAttempts}, expires: ${lockoutExpiresAt}`);

            return {
                isLocked: true,
                attemptsRemaining: 0,
                lockoutExpiresAt
            };
        }

        // Update failed attempts count
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: newFailedAttempts
            }
        });

        return {
            isLocked: false,
            attemptsRemaining: config.maxAttempts - newFailedAttempts
        };
    }

    /**
     * Record a successful login (resets failed attempts)
     */
    async recordSuccessfulLogin(
        email: string,
        ipAddress: string,
        userAgent?: string
    ): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true }
        });

        if (!user) return;

        // Log the successful attempt
        await this.prisma.loginAttempt.create({
            data: {
                userId: user.id,
                email,
                ipAddress,
                userAgent,
                success: true
            }
        });

        // Reset failed attempts and unlock if needed
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockedAt: null,
                lockoutExpiresAt: null,
                lastLoginAt: new Date()
            }
        });
    }

    /**
     * Manually unlock an account (admin function)
     */
    async unlockAccount(email: string): Promise<{ success: boolean; message: string }> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true, lockedAt: true }
        });

        if (!user) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        if (!user.lockedAt) {
            return {
                success: false,
                message: 'Account is not locked'
            };
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockedAt: null,
                lockoutExpiresAt: null
            }
        });

        this.logger.log(`Account manually unlocked for email: ${email}`);

        return {
            success: true,
            message: 'Account unlocked successfully'
        };
    }

    /**
     * Calculate lockout duration with progressive lockout support
     */
    private async calculateLockoutDuration(userId: string, config: LockoutConfiguration): Promise<number> {
        if (!config.progressiveLockout) {
            return config.lockoutDuration;
        }

        // Count previous lockouts in the last 24 hours
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLockouts = await this.prisma.loginAttempt.count({
            where: {
                userId,
                lockoutTriggered: true,
                createdAt: {
                    gte: last24Hours
                }
            }
        });

        // Progressive lockout: double duration for each previous lockout
        const multiplier = Math.pow(2, recentLockouts);
        return Math.min(config.lockoutDuration * multiplier, 24 * 60 * 60 * 1000); // Max 24 hours
    }

    /**
     * Get lockout statistics for monitoring
     */
    async getLockoutStatistics(timeframe: 'hour' | 'day' | 'week' = 'day') {
        const timeframes = {
            hour: 60 * 60 * 1000,
            day: 24 * 60 * 60 * 1000,
            week: 7 * 24 * 60 * 60 * 1000
        };

        const since = new Date(Date.now() - timeframes[timeframe]);

        const [failedAttempts, lockouts, uniqueIPs] = await Promise.all([
            this.prisma.loginAttempt.count({
                where: {
                    success: false,
                    createdAt: { gte: since }
                }
            }),
            this.prisma.loginAttempt.count({
                where: {
                    lockoutTriggered: true,
                    createdAt: { gte: since }
                }
            }),
            this.prisma.loginAttempt.groupBy({
                by: ['ipAddress'],
                where: {
                    success: false,
                    createdAt: { gte: since }
                }
            })
        ]);

        return {
            timeframe,
            failedAttempts,
            lockouts,
            uniqueIPs: uniqueIPs.length,
            period: since
        };
    }

    /**
     * Get list of currently locked accounts
     */
    async getLockedAccounts() {
        const now = new Date();

        return this.prisma.user.findMany({
            where: {
                lockedAt: { not: null },
                lockoutExpiresAt: { gt: now }
            },
            select: {
                id: true,
                email: true,
                failedLoginAttempts: true,
                lockedAt: true,
                lockoutExpiresAt: true
            }
        });
    }
}