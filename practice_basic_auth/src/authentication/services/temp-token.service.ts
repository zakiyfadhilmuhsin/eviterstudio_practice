import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

export interface TempLoginToken {
    userId: string;
    email: string;
    loginAttemptId?: string;
    expiresAt: Date;
}

@Injectable()
export class TempTokenService {
    /**
     * == Table of Contents ==
     * 
     * 1. Generate Temporary Token for 2FA Login Flow
     * 2. Verify Temporary Token
     * 3. Invalidate Temporary Token
     * 4. Cleanup Expired Temporary Tokens
     * 5. Get User from Temporary Token
     * 
     * ==========================================
     */
    constructor(private prisma: PrismaService) {}

    /**
     * Generate temporary token for 2FA login flow
     */
    async generateTempToken(userId: string, email: string, loginAttemptId?: string): Promise<string> {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        const payload: TempLoginToken = {
            userId,
            email,
            loginAttemptId,
            expiresAt
        };

        // Use JWT for temporary token with short expiration
        const tempToken = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'your-super-secret-key-here',
            {
                expiresIn: '5m',
                issuer: 'practice-auth-temp',
                subject: userId
            }
        );

        // Store temp token hash in database for additional security
        const tokenHash = crypto.createHash('sha256').update(tempToken).digest('hex');

        await this.prisma.session.create({
            data: {
                id: crypto.randomUUID(),
                userId,
                token: tokenHash,
                expiresAt,
                ipAddress: 'temp-2fa-token',
                userAgent: '2FA-Login-Flow'
            }
        });

        return tempToken;
    }

    /**
     * Verify and decode temporary token
     */
    async verifyTempToken(tempToken: string): Promise<TempLoginToken | null> {
        try {
            // Verify JWT token
            const decoded = jwt.verify(
                tempToken,
                process.env.JWT_SECRET || 'your-super-secret-key-here',
                {
                    issuer: 'practice-auth-temp'
                }
            ) as TempLoginToken;

            // Check if token exists in database
            const tokenHash = crypto.createHash('sha256').update(tempToken).digest('hex');
            const storedToken = await this.prisma.session.findFirst({
                where: {
                    token: tokenHash,
                    userId: decoded.userId,
                    userAgent: '2FA-Login-Flow',
                    expiresAt: {
                        gt: new Date()
                    }
                }
            });

            if (!storedToken) {
                return null;
            }

            return decoded;
        } catch (error) {
            return null;
        }
    }

    /**
     * Invalidate temporary token after use
     */
    async invalidateTempToken(tempToken: string): Promise<void> {
        try {
            const tokenHash = crypto.createHash('sha256').update(tempToken).digest('hex');

            await this.prisma.session.deleteMany({
                where: {
                    token: tokenHash,
                    userAgent: '2FA-Login-Flow'
                }
            });
        } catch (error) {
            // Log error but don't throw - this is cleanup
            console.error('Failed to invalidate temp token:', error);
        }
    }

    /**
     * Cleanup expired temporary tokens
     */
    async cleanupExpiredTokens(): Promise<number> {
        const result = await this.prisma.session.deleteMany({
            where: {
                userAgent: '2FA-Login-Flow',
                expiresAt: {
                    lt: new Date()
                }
            }
        });

        return result.count;
    }

    /**
     * Get user from temporary token without verification
     */
    async getUserFromTempToken(tempToken: string): Promise<{ userId: string; email: string } | null> {
        try {
            const decoded = jwt.decode(tempToken) as TempLoginToken;

            if (!decoded || !decoded.userId || !decoded.email) {
                return null;
            }

            return {
                userId: decoded.userId,
                email: decoded.email
            };
        } catch (error) {
            return null;
        }
    }
}