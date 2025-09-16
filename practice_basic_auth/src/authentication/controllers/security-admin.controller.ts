import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimit } from '../guards/rate-limit.guard';
import { Roles } from 'src/authorization/decorators/roles.decorator';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { AccountLockoutService } from '../services/account-lockout.service';
import { SecurityService } from '../services/security.service';

@Controller('admin/security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'security_admin')
export class SecurityAdminController {
    /**
     * == Table of Contents ==
     * 
     * 1. Account Lockout Management
     *  1.a. Get Locked Accounts
     *  1.b. Unlock Account
     *  1.c. Get Lockout Statistics
     * 2. Security Monitoring
     *  2.a. Get Security Metrics
     *  2.b. Block Suspicious IP
     *  2.c. Get IP Status
     *  2.d. Analyze Suspicious Activity
     * 3. Audit & Monitoring
     *  3.a. Get Security Events
     *  3.b. Get Security Dashboard
     * 4. Configuration
     *  4.a. Get Security Configuration
     * 
     * =========================================
     */
    constructor(
        private accountLockoutService: AccountLockoutService,
        private securityService: SecurityService
    ) {}

    // =============================================
    // ACCOUNT LOCKOUT MANAGEMENT
    // =============================================

    /**
     * Get all currently locked accounts
     */
    @Get('locked-accounts')
    @RateLimit({ endpoint: 'sensitive' })
    async getLockedAccounts() {
        const lockedAccounts = await this.accountLockoutService.getLockedAccounts();
        return {
            message: 'Locked accounts retrieved successfully',
            data: lockedAccounts,
            count: lockedAccounts.length
        };
    }

    /**
     * Manually unlock a specific account
     */
    @Post('unlock-account')
    @RateLimit({ endpoint: 'sensitive' })
    @HttpCode(HttpStatus.OK)
    async unlockAccount(@Body() body: { email: string; reason?: string }) {
        const result = await this.accountLockoutService.unlockAccount(body.email);

        if (result.success) {
            // Log the admin action for audit
            // This could be enhanced to include the admin user info
            console.log(`Admin unlock: ${body.email}, reason: ${body.reason || 'Manual unlock'}`);
        }

        return result;
    }

    /**
     * Get lockout statistics
     */
    @Get('lockout-stats')
    @RateLimit({ endpoint: 'auth' })
    async getLockoutStatistics(@Query('timeframe') timeframe: 'hour' | 'day' | 'week' = 'day') {
        const stats = await this.accountLockoutService.getLockoutStatistics(timeframe);
        return {
            message: 'Lockout statistics retrieved successfully',
            data: stats
        };
    }

    // =============================================
    // SECURITY MONITORING
    // =============================================

    /**
     * Get comprehensive security metrics
     */
    @Get('metrics')
    @RateLimit({ endpoint: 'auth' })
    async getSecurityMetrics(@Query('timeframe') timeframe: 'hour' | 'day' | 'week' = 'hour') {
        const metrics = await this.securityService.getSecurityMetrics(timeframe);
        return {
            message: 'Security metrics retrieved successfully',
            data: metrics
        };
    }

    /**
     * Block a suspicious IP address
     */
    @Post('block-ip')
    @RateLimit({ endpoint: 'sensitive' })
    @HttpCode(HttpStatus.OK)
    async blockIP(@Body() body: {
        ipAddress: string;
        reason: string;
        duration?: number; // in milliseconds
    }) {
        const duration = body.duration || 24 * 60 * 60 * 1000; // Default 24 hours

        await this.securityService.blockSuspiciousIP(
            body.ipAddress,
            `Admin block: ${body.reason}`,
            duration
        );

        return {
            message: `IP ${body.ipAddress} blocked successfully`,
            blockedUntil: new Date(Date.now() + duration),
            reason: body.reason
        };
    }

    /**
     * Check if an IP is currently blocked
     */
    @Get('ip-status/:ipAddress')
    @RateLimit({ endpoint: 'auth' })
    async getIPStatus(@Param('ipAddress') ipAddress: string) {
        const isBlocked = this.securityService.isIPBlocked(ipAddress);

        return {
            ipAddress,
            isBlocked,
            status: isBlocked ? 'BLOCKED' : 'ALLOWED'
        };
    }

    /**
     * Analyze suspicious activity for an IP
     */
    @Post('analyze-ip')
    @RateLimit({ endpoint: 'auth' })
    @HttpCode(HttpStatus.OK)
    async analyzeIP(@Body() body: {
        ipAddress: string;
        userAgent?: string;
    }) {
        const analysis = await this.securityService.analyzeSuspiciousActivity(
            body.ipAddress,
            body.userAgent
        );

        return {
            message: 'IP analysis completed',
            ipAddress: body.ipAddress,
            analysis
        };
    }

    // =============================================
    // AUDIT & MONITORING
    // =============================================

    /**
     * Get recent security events
     */
    @Get('events')
    @RateLimit({ endpoint: 'auth' })
    async getSecurityEvents(@Query() query: {
        limit?: number;
        offset?: number;
        severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        type?: string;
    }) {
        // This would typically query the audit logs
        // For now, return a placeholder structure
        return {
            message: 'Security events retrieved successfully',
            data: {
                events: [],
                pagination: {
                    limit: query.limit || 50,
                    offset: query.offset || 0,
                    total: 0
                }
            }
        };
    }

    /**
     * Get security dashboard summary
     */
    @Get('dashboard')
    @RateLimit({ endpoint: 'auth' })
    async getSecurityDashboard() {
        const [
            lockedAccounts,
            lockoutStats,
            securityMetrics
        ] = await Promise.all([
            this.accountLockoutService.getLockedAccounts(),
            this.accountLockoutService.getLockoutStatistics('day'),
            this.securityService.getSecurityMetrics('day')
        ]);

        return {
            message: 'Security dashboard data retrieved successfully',
            data: {
                summary: {
                    activeLockedAccounts: lockedAccounts.length,
                    failedLoginsToday: lockoutStats.failedAttempts,
                    lockoutsToday: lockoutStats.lockouts,
                    suspiciousIPsToday: securityMetrics.suspiciousIPs
                },
                lockedAccounts,
                lockoutStats,
                securityMetrics
            }
        };
    }

    // =============================================
    // CONFIGURATION
    // =============================================

    /**
     * Get current security configuration
     */
    @Get('config')
    @RateLimit({ endpoint: 'auth' })
    async getSecurityConfig() {
        // In a real implementation, this would return the current configuration
        return {
            message: 'Security configuration retrieved successfully',
            data: {
                lockout: {
                    maxAttempts: 5,
                    lockoutDuration: 15 * 60 * 1000, // 15 minutes
                    attemptWindow: 5 * 60 * 1000, // 5 minutes
                    progressiveLockout: true
                },
                rateLimit: {
                    global: { limit: 100, window: 60000 },
                    auth: { limit: 10, window: 60000 },
                    login: { limit: 5, window: 60000 }
                }
            }
        };
    }
}