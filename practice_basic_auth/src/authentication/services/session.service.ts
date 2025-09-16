import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface SessionInfo {
    id: string;
    device: string;
    browser: string;
    os: string;
    location?: string;
    ipAddress: string;
    lastActive: Date;
    createdAt: Date;
    expiresAt: Date;
    current: boolean;
}

export interface CreateSessionData {
    userId: string;
    token: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt?: Date;
}

@Injectable()
export class SessionService {
    /**
     * == Table of Contents ==
     * 
     * 1. Session Creation
     *    - Create Session
     * 2. Session Retrieval
     *    - Get User Sessions
     * 3. Session Revocation
     *    - Revoke Session
     *    - Revoke All Sessions Except Current
     *    - Cleanup Expired Sessions
     * 4. Session Validation & Activity
     *    - Update Session Activity
     *    - Validate Session
     * 5. Session Statistics
     *    - Get Session Stats
     * 
     * =============================================
     */
    constructor(private prisma: PrismaService) {}

    /**
     * Create a new session
     * Records user agent, IP address, and expiration
     */
    async createSession(data: CreateSessionData): Promise<void> {
        const expiresAt = data.expiresAt || new Date(Date.now() + 60 * 60 * 1000); // 1 hour default

        await this.prisma.session.create({
            data: {
                userId: data.userId,
                token: data.token,
                userAgent: data.userAgent,
                ipAddress: data.ipAddress,
                expiresAt
            }
        });
    }

    /**
     * Get all active sessions for a user
     * Includes device info, location, and whether it's the current session
     */
    async getUserSessions(userId: string, currentToken?: string): Promise<SessionInfo[]> {
        const sessions = await this.prisma.session.findMany({
            where: {
                userId,
                expiresAt: {
                    gt: new Date() // Only active sessions
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return sessions.map(session => ({
            id: session.id,
            ...this.parseUserAgent(session.userAgent || ''),
            location: this.getLocationFromIP(session.ipAddress || ''),
            ipAddress: session.ipAddress || 'Unknown',
            lastActive: session.updatedAt,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            current: session.token === currentToken
        }));
    }

    /**
     * Revoke a specific session
     * Prevents revoking the current session
     */
    async revokeSession(userId: string, sessionId: string, currentToken?: string): Promise<{ message: string }> {
        // Find the session
        const session = await this.prisma.session.findFirst({
            where: {
                id: sessionId,
                userId
            }
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        // Prevent revoking current session
        if (session.token === currentToken) {
            throw new ForbiddenException('Cannot revoke current session');
        }

        // Delete the session
        await this.prisma.session.delete({
            where: { id: sessionId }
        });

        return { message: 'Session revoked successfully' };
    }

    /**
     * Revoke all sessions except current
     * Useful for "Log out from all devices" feature
     */
    async revokeAllSessions(userId: string, currentToken?: string): Promise<{ message: string, revokedCount: number }> {
        const whereClause: any = { userId };

        // If current token provided, exclude it
        if (currentToken) {
            whereClause.token = { not: currentToken };
        }

        const result = await this.prisma.session.deleteMany({
            where: whereClause
        });

        return {
            message: `All sessions revoked successfully`,
            revokedCount: result.count
        };
    }

    /**
     * Clean up expired sessions
     * Can be run periodically as a maintenance task
     */
    async cleanupExpiredSessions(): Promise<{ message: string, deletedCount: number }> {
        const result = await this.prisma.session.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });

        return {
            message: 'Expired sessions cleaned up',
            deletedCount: result.count
        };
    }

    /**
     * Update session last activity
     * Called on each authenticated request to keep session active
     */
    async updateSessionActivity(token: string): Promise<void> {
        await this.prisma.session.updateMany({
            where: { token },
            data: { updatedAt: new Date() }
        });
    }

    /**
     * Check if session is valid
     * Returns true if session exists and is not expired
     */
    async validateSession(token: string): Promise<boolean> {
        const session = await this.prisma.session.findFirst({
            where: {
                token,
                expiresAt: {
                    gt: new Date()
                }
            }
        });

        return !!session;
    }

    /**
     * Get session statistics for a user
     * Includes total active sessions, unique devices, recent logins, and oldest session
     */
    async getSessionStats(userId: string): Promise<{
        totalActive: number;
        totalDevices: number;
        recentLogins: number;
        oldestSession: Date | null;
    }> {
        const sessions = await this.prisma.session.findMany({
            where: {
                userId,
                expiresAt: { gt: new Date() }
            },
            select: {
                userAgent: true,
                createdAt: true
            }
        });

        const uniqueDevices = new Set(
            sessions.map(s => this.parseUserAgent(s.userAgent || '').device)
        ).size;

        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLogins = sessions.filter(s => s.createdAt > last24Hours).length;

        const oldestSession = sessions.length > 0
            ? sessions.reduce((oldest, current) =>
                current.createdAt < oldest.createdAt ? current : oldest
              ).createdAt
            : null;

        return {
            totalActive: sessions.length,
            totalDevices: uniqueDevices,
            recentLogins,
            oldestSession
        };
    }

    /**
     * Parse user agent string to extract device info
     * In production, consider using a library for more accurate parsing
     */
    private parseUserAgent(userAgent: string): { device: string; browser: string; os: string } {
        if (!userAgent) {
            return { device: 'Unknown Device', browser: 'Unknown Browser', os: 'Unknown OS' };
        }

        // Simple user agent parsing - in production use a library like ua-parser-js
        let browser = 'Unknown Browser';
        let os = 'Unknown OS';
        let device = 'Unknown Device';

        // Browser detection
        if (userAgent.includes('Chrome')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';
        else if (userAgent.includes('Opera')) browser = 'Opera';

        // OS detection
        if (userAgent.includes('Windows')) os = 'Windows';
        else if (userAgent.includes('Mac OS')) os = 'macOS';
        else if (userAgent.includes('Linux')) os = 'Linux';
        else if (userAgent.includes('Android')) os = 'Android';
        else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

        // Device type detection
        if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
            device = 'Mobile Device';
        } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
            device = 'Tablet';
        } else {
            device = 'Desktop';
        }

        // Combine for display
        const deviceDisplay = `${browser} - ${os}`;

        return { device: deviceDisplay, browser, os };
    }

    /**
     * Get location from IP address (placeholder implementation)
     * In production, integrate with a geolocation service
     */
    private getLocationFromIP(ipAddress: string): string {
        // In production, use a service like MaxMind GeoIP or IP2Location
        // For now, return placeholder based on common IP patterns

        if (!ipAddress || ipAddress === 'Unknown') return 'Unknown Location';

        // Localhost detection
        if (ipAddress.includes('127.0.0.1') || ipAddress.includes('::1') || ipAddress.includes('localhost')) {
            return 'Localhost';
        }

        // Private IP ranges
        if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
            return 'Local Network';
        }

        // For production, implement actual geolocation lookup
        return 'Remote Location';
    }
}