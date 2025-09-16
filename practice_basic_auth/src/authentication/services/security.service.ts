import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface SecurityAlert {
  type: 'SUSPICIOUS_ACTIVITY' | 'RATE_LIMIT_EXCEEDED' | 'BRUTE_FORCE_DETECTED' | 'ACCOUNT_LOCKOUT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface SecurityMetrics {
  timeframe: string;
  failedLogins: number;
  rateLimitViolations: number;
  lockedAccounts: number;
  suspiciousIPs: number;
  averageRequestsPerIP: number;
}

@Injectable()
export class SecurityService {
    private readonly logger = new Logger(SecurityService.name);
    private readonly rateLimitCache = new Map<string, { count: number; resetTime: number }>();
    private readonly suspiciousActivityCache = new Map<string, number>();

    // Rate limiting configurations for different endpoints
    private readonly rateLimitConfigs = {
        global: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
        auth: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 auth requests per minute
        login: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 login attempts per minute
        register: { windowMs: 60 * 1000, maxRequests: 3 }, // 3 registration attempts per minute
        password: { windowMs: 5 * 60 * 1000, maxRequests: 3 }, // 3 password resets per 5 minutes
        sensitive: { windowMs: 5 * 60 * 1000, maxRequests: 2 } // 2 sensitive operations per 5 minutes
    };

    /**
     * == Table of Contents ==
     * 
     * 1. Check Rate Limits
     * 2. Analyze Suspicious Activity
     * 3. Detect Brute Force Attacks
     * 4. Get Security Metrics
     * 5. Block Suspicious IPs
     * 6. Is IP Blocked
     * 7. Get Login Attempts for User
     * 8. Mask IP Address
     * 9. Get User Agent Info
     * 10. Cleanup Cache
     * 
     * ========================================= 
     */
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService
    ) {
        // Clean up cache every 5 minutes
        setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
    }

    /**
     * Check if request should be rate limited
     */
    async checkRateLimit(
        identifier: string,
        endpoint: keyof typeof this.rateLimitConfigs = 'global'
    ): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
        const config = this.getRateLimitConfig(endpoint);
        const key = `${endpoint}:${identifier}`;
        const now = Date.now();

        let entry = this.rateLimitCache.get(key);

        // Initialize or reset if window expired
        if (!entry || now >= entry.resetTime) {
            entry = {
                count: 0,
                resetTime: now + config.windowMs
            };
        }

        entry.count++;
        this.rateLimitCache.set(key, entry);

        const allowed = entry.count <= config.maxRequests;
        const remaining = Math.max(0, config.maxRequests - entry.count);

        if (!allowed) {
            await this.logSecurityEvent({
                type: 'RATE_LIMIT_EXCEEDED',
                severity: 'MEDIUM',
                message: `Rate limit exceeded for ${endpoint} endpoint`,
                metadata: {
                    identifier,
                    endpoint,
                    count: entry.count,
                    limit: config.maxRequests,
                    windowMs: config.windowMs
                },
                timestamp: new Date()
            });
        }

        return {
            allowed,
            resetTime: entry.resetTime,
            remaining
        };
    }

    /**
     * Analyze suspicious activity patterns
     */
    async analyzeSuspiciousActivity(
        ipAddress: string,
        userAgent?: string,
        endpoint?: string
    ): Promise<{ isSuspicious: boolean; riskScore: number; reasons: string[] }> {
        const reasons: string[] = [];
        let riskScore = 0;

        // Check for high frequency requests from same IP
        const recentActivity = await this.getRecentActivityByIP(ipAddress);
        if (recentActivity.requestCount > 50) {
            riskScore += 30;
            reasons.push('High frequency requests from same IP');
        }

        // Check for failed login patterns
        if (recentActivity.failedLogins > 10) {
            riskScore += 40;
            reasons.push('Multiple failed login attempts');
        }

        // Check for distributed attack patterns
        const activeIPs = await this.getActiveIPsInTimeframe(5 * 60 * 1000); // Last 5 minutes
        if (activeIPs > 20) {
            riskScore += 20;
            reasons.push('High number of active IPs (possible distributed attack)');
        }

        // Check user agent patterns
        if (userAgent) {
            if (this.isSuspiciousUserAgent(userAgent)) {
                riskScore += 25;
                reasons.push('Suspicious user agent detected');
            }
        }

        // Geographic anomaly detection (placeholder - would integrate with GeoIP)
        // This would check for logins from unusual geographic locations

        const isSuspicious = riskScore >= 50;

        if (isSuspicious) {
            await this.logSecurityEvent({
                type: 'SUSPICIOUS_ACTIVITY',
                severity: riskScore >= 80 ? 'HIGH' : 'MEDIUM',
                message: `Suspicious activity detected from IP: ${ipAddress}`,
                metadata: {
                    ipAddress,
                    userAgent,
                    riskScore,
                    reasons,
                    recentActivity
                },
                timestamp: new Date()
            });
        }

        return { isSuspicious, riskScore, reasons };
    }

    /**
     * Detect brute force attacks
     */
    async detectBruteForceAttack(ipAddress: string): Promise<boolean> {
        const last10Minutes = new Date(Date.now() - 10 * 60 * 1000);

        const failedAttempts = await this.prisma.loginAttempt.count({
            where: {
                ipAddress,
                success: false,
                createdAt: { gte: last10Minutes }
            }
        });

        const isBruteForce = failedAttempts >= 10; // 10 failed attempts in 10 minutes

        if (isBruteForce) {
            await this.logSecurityEvent({
                type: 'BRUTE_FORCE_DETECTED',
                severity: 'HIGH',
                message: `Brute force attack detected from IP: ${ipAddress}`,
                metadata: {
                    ipAddress,
                    failedAttempts,
                    timeframe: '10 minutes'
                },
                timestamp: new Date()
            });
        }

        return isBruteForce;
    }

    /**
     * Get security metrics for monitoring dashboard
     */
    async getSecurityMetrics(timeframe: 'hour' | 'day' | 'week' = 'hour'): Promise<SecurityMetrics> {
        const timeframes = {
            hour: 60 * 60 * 1000,
            day: 24 * 60 * 60 * 1000,
            week: 7 * 24 * 60 * 60 * 1000
        };

        const since = new Date(Date.now() - timeframes[timeframe]);

        const [
            failedLogins,
            lockedAccounts,
            uniqueIPs,
            totalRequests
        ] = await Promise.all([
            this.prisma.loginAttempt.count({
                where: {
                    success: false,
                    createdAt: { gte: since }
                }
            }),
            this.prisma.user.count({
                where: {
                    lockedAt: { not: null },
                    lockoutExpiresAt: { gt: new Date() }
                }
            }),
            this.prisma.loginAttempt.groupBy({
                by: ['ipAddress'],
                where: { createdAt: { gte: since } }
            }),
            this.prisma.loginAttempt.count({
                where: { createdAt: { gte: since } }
            })
        ]);

        const suspiciousIPs = await this.getSuspiciousIPs(since);

        return {
            timeframe,
            failedLogins,
            rateLimitViolations: 0, // Would be tracked from rate limit cache
            lockedAccounts,
            suspiciousIPs: suspiciousIPs.length,
            averageRequestsPerIP: uniqueIPs.length > 0 ? totalRequests / uniqueIPs.length : 0
        };
    }

    /**
     * Block suspicious IP addresses
     */
    async blockSuspiciousIP(
        ipAddress: string,
        reason: string,
        duration: number = 24 * 60 * 60 * 1000 // 24 hours default
    ): Promise<void> {
        // In a real implementation, this would integrate with firewall/load balancer
        // For now, we'll log it and track in cache

        this.suspiciousActivityCache.set(ipAddress, Date.now() + duration);

        await this.logSecurityEvent({
            type: 'SUSPICIOUS_ACTIVITY',
            severity: 'HIGH',
            message: `IP address blocked: ${ipAddress}`,
            metadata: {
                ipAddress,
                reason,
                duration,
                blockedUntil: new Date(Date.now() + duration)
            },
            timestamp: new Date()
        });

        this.logger.warn(`Blocked suspicious IP: ${ipAddress} for ${duration}ms. Reason: ${reason}`);
    }

    /**
     * Check if IP is currently blocked
     */
    isIPBlocked(ipAddress: string): boolean {
        const blockedUntil = this.suspiciousActivityCache.get(ipAddress);
        if (!blockedUntil) return false;

        if (Date.now() >= blockedUntil) {
            this.suspiciousActivityCache.delete(ipAddress);
            return false;
        }

        return true;
    }

    /**
     * Get rate limit configuration
     */
    private getRateLimitConfig(endpoint: keyof typeof this.rateLimitConfigs): RateLimitConfig {
        const config = this.rateLimitConfigs[endpoint];
        return {
            windowMs: this.configService.get<number>(`RATE_LIMIT_${endpoint.toUpperCase()}_WINDOW`) || config.windowMs,
            maxRequests: this.configService.get<number>(`RATE_LIMIT_${endpoint.toUpperCase()}_MAX`) || config.maxRequests
        };
    }

    /**
     * Get recent activity for an IP address
     */
    private async getRecentActivityByIP(ipAddress: string) {
        const last15Minutes = new Date(Date.now() - 15 * 60 * 1000);

        const [requestCount, failedLogins] = await Promise.all([
            this.prisma.loginAttempt.count({
                where: {
                    ipAddress,
                    createdAt: { gte: last15Minutes }
                }
            }),
            this.prisma.loginAttempt.count({
                where: {
                    ipAddress,
                    success: false,
                    createdAt: { gte: last15Minutes }
                }
            })
        ]);

        return { requestCount, failedLogins };
    }

    /**
     * Get count of active IPs in timeframe
     */
    private async getActiveIPsInTimeframe(timeframeMs: number): Promise<number> {
        const since = new Date(Date.now() - timeframeMs);

        const uniqueIPs = await this.prisma.loginAttempt.groupBy({
            by: ['ipAddress'],
            where: { createdAt: { gte: since } }
        });

        return uniqueIPs.length;
    }

    /**
     * Check if user agent is suspicious
     */
    private isSuspiciousUserAgent(userAgent: string): boolean {
        const suspiciousPatterns = [
            /curl/i,
            /wget/i,
            /python-requests/i,
            /bot/i,
            /crawler/i,
            /scanner/i,
            /exploit/i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(userAgent));
    }

    /**
     * Get list of suspicious IP addresses
     */
    private async getSuspiciousIPs(since: Date): Promise<string[]> {
        const suspiciousActivity = await this.prisma.loginAttempt.groupBy({
            by: ['ipAddress'],
            where: {
                success: false,
                createdAt: { gte: since }
            },
            having: {
                ipAddress: {
                    _count: {
                        gt: 5 // More than 5 failed attempts
                    }
                }
            }
        });

        return suspiciousActivity.map(activity => activity.ipAddress);
    }

    /**
     * Log security events
     */
    private async logSecurityEvent(alert: SecurityAlert): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    action: alert.type,
                    resource: 'SECURITY',
                    details: {
                        severity: alert.severity,
                        message: alert.message,
                        metadata: alert.metadata
                    },
                    success: true,
                    ipAddress: alert.metadata.ipAddress
                }
            });

            // In production, you might also want to:
            // - Send alerts to monitoring systems
            // - Notify security team for high/critical alerts
            // - Integrate with SIEM systems

            if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
                this.logger.error(`Security Alert [${alert.severity}]: ${alert.message}`, alert.metadata);
            } else {
                this.logger.warn(`Security Alert [${alert.severity}]: ${alert.message}`);
            }
        } catch (error) {
            this.logger.error('Failed to log security event:', error);
        }
    }

    /**
     * Get login attempts for a specific user
     */
    async getLoginAttemptsForUser(
        email: string,
        options: {
            since?: Date;
            limit?: number;
            includeSuccessful?: boolean;
            includeFailed?: boolean;
        } = {}
    ) {
        const {
            since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default: last 7 days
            limit = 20,
            includeSuccessful = true,
            includeFailed = true
        } = options;

        const whereConditions: any = {
            email,
            createdAt: { gte: since }
        };

        // Filter by success status if needed
        if (includeSuccessful && !includeFailed) {
            whereConditions.success = true;
        } else if (!includeSuccessful && includeFailed) {
            whereConditions.success = false;
        }

        const attempts = await this.prisma.loginAttempt.findMany({
            where: whereConditions,
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                ipAddress: true,
                userAgent: true,
                success: true,
                failureReason: true,
                lockoutTriggered: true,
                createdAt: true
            }
        });

        return attempts.map(attempt => ({
            ...attempt,
            ipAddress: this.maskIP(attempt.ipAddress), // Mask IP for privacy
            userAgent: this.getUserAgentInfo(attempt.userAgent)
        }));
    }

    /**
     * Mask IP address for privacy (show only first 3 octets)
     */
    private maskIP(ipAddress: string): string {
        if (!ipAddress || ipAddress === 'unknown') return 'Unknown';

        const parts = ipAddress.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
        }

        // For IPv6 or other formats, mask last part
        const lastColonIndex = ipAddress.lastIndexOf(':');
        if (lastColonIndex > -1) {
            return ipAddress.substring(0, lastColonIndex) + ':xxxx';
        }

        return 'Masked';
    }

    /**
     * Extract useful info from user agent
     */
    private getUserAgentInfo(userAgent?: string): { browser?: string; os?: string; device?: string } {
        if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };

        const result: { browser?: string; os?: string; device?: string } = {};

        // Simple browser detection
        if (userAgent.includes('Chrome')) result.browser = 'Chrome';
        else if (userAgent.includes('Firefox')) result.browser = 'Firefox';
        else if (userAgent.includes('Safari')) result.browser = 'Safari';
        else if (userAgent.includes('Edge')) result.browser = 'Edge';
        else result.browser = 'Other';

        // Simple OS detection
        if (userAgent.includes('Windows')) result.os = 'Windows';
        else if (userAgent.includes('Mac')) result.os = 'macOS';
        else if (userAgent.includes('Linux')) result.os = 'Linux';
        else if (userAgent.includes('Android')) result.os = 'Android';
        else if (userAgent.includes('iOS')) result.os = 'iOS';
        else result.os = 'Other';

        // Simple device detection
        if (userAgent.includes('Mobile')) result.device = 'Mobile';
        else if (userAgent.includes('Tablet')) result.device = 'Tablet';
        else result.device = 'Desktop';

        return result;
    }

    /**
     * Clean up expired cache entries
     */
    private cleanupCache(): void {
        const now = Date.now();

        // Clean up rate limit cache
        for (const [key, entry] of this.rateLimitCache.entries()) {
            if (now >= entry.resetTime) {
                this.rateLimitCache.delete(key);
            }
        }

        // Clean up suspicious activity cache
        for (const [ip, blockedUntil] of this.suspiciousActivityCache.entries()) {
            if (now >= blockedUntil) {
                this.suspiciousActivityCache.delete(ip);
            }
        }
    }
}