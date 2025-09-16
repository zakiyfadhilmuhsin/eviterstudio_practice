import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomBytes } from 'crypto';

export interface CreateRefreshTokenData {
    userId: string;
    rememberMe: boolean;
    userAgent?: string;
    ipAddress?: string;
}

export interface RefreshTokenInfo {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    isRevoked: boolean;
    userAgent?: string;
    ipAddress?: string;
    createdAt: Date;
}

@Injectable()
export class RefreshTokenService {
    /**
     * == Table of Contents ==
     * 
     * - Create Refresh Token
     * - Validate Refresh Token
     * - Generate New Access Token
     * - Refresh Token Rotation
     * - Revoke Refresh Token
     * - Revoke Refresh Token By ID
     * - Revoke All User Refresh Tokens
     * - Get User Refresh Tokens
     * - Cleanup Expired Tokens
     * - Get Token Statistics
     * 
     * ============================================= 
     */
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService
    ) {}

    /**
     * Create Refresh Token
     * Creates a new refresh token with Remember Me support
     * @param data
     * @returns
     */
    async createRefreshToken(data: CreateRefreshTokenData): Promise<string> {
        // Generate secure random token
        const token = randomBytes(32).toString('hex');

        // Calculate expiration based on Remember Me
        const expirationDays = data.rememberMe ? 30 : 7; // 30 days if Remember Me, 7 days otherwise
        const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

        // Store in database
        await this.prisma.refreshToken.create({
            data: {
                userId: data.userId,
                token,
                expiresAt,
                userAgent: data.userAgent,
                ipAddress: data.ipAddress
            }
        });

        return token;
    }

    /**
     * Validate Refresh Token
     * Validates refresh token and returns user info if valid
     * @param token
     * @returns
     */
    async validateRefreshToken(token: string): Promise<{ userId: string; user: any }> {
        const refreshToken = await this.prisma.refreshToken.findUnique({
            where: { token },
            include: {
                user: true
            }
        });

        if (!refreshToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (refreshToken.isRevoked) {
            throw new UnauthorizedException('Refresh token has been revoked');
        }

        if (refreshToken.expiresAt < new Date()) {
            // Token expired, clean it up
            await this.revokeRefreshToken(token);
            throw new UnauthorizedException('Refresh token has expired');
        }

        if (!refreshToken.user.isActive) {
            throw new UnauthorizedException('User account is deactivated');
        }

        return {
            userId: refreshToken.userId,
            user: refreshToken.user
        };
    }

    /**
     * Generate New Access Token
     * Creates a new access token using refresh token
     * @param refreshToken
     * @returns
     */
    async generateNewAccessToken(refreshToken: string): Promise<string> {
        const { user } = await this.validateRefreshToken(refreshToken);

        const payload = {
            sub: user.id,
            email: user.email,
            isVerified: user.isVerified
        };

        return await this.jwtService.signAsync(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: '1h'
        });
    }

    /**
     * Refresh Token Rotation
     * Implements refresh token rotation for security
     * @param oldToken
     * @param userAgent
     * @param ipAddress
     * @returns
     */
    async rotateRefreshToken(
        oldToken: string,
        userAgent?: string,
        ipAddress?: string
    ): Promise<{ accessToken: string; refreshToken: string }> {
        // Step 1: Validate token and get user info
        const { userId, user } = await this.validateRefreshToken(oldToken);

        // Step 2: Get token info BEFORE revoking (untuk cek Remember Me)
        const oldTokenData = await this.prisma.refreshToken.findUnique({
            where: { token: oldToken }
        });

        const wasRememberMe = oldTokenData ?
            (oldTokenData.expiresAt.getTime() - oldTokenData.createdAt.getTime()) > (7 * 24 * 60 * 60 * 1000) :
            false;

        // Step 3: Create new access token (gunakan user data, bukan token)
        const payload = {
            sub: user.id,
            email: user.email,
            isVerified: user.isVerified
        };

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: '1h'
        });

        // Step 4: Create new refresh token
        const newRefreshToken = await this.createRefreshToken({
            userId,
            rememberMe: wasRememberMe,
            userAgent,
            ipAddress
        });

        // Step 5: Revoke old token (di akhir setelah semua selesai)
        await this.revokeRefreshToken(oldToken);

        return {
            accessToken,
            refreshToken: newRefreshToken
        };
    }

    /**
     * Revoke Refresh Token
     * Revokes a specific refresh token
     * @param token
     */
    async revokeRefreshToken(token: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { token },
            data: { isRevoked: true }
        });
    }

    /**
     * Revoke Refresh Token By ID
     * Revokes a specific refresh token by ID with user ownership validation
     * @param tokenId
     * @param userId
     */
    async revokeRefreshTokenById(tokenId: string, userId: string): Promise<void> {
        const token = await this.prisma.refreshToken.findUnique({
            where: { id: tokenId }
        });

        if (!token) {
            throw new NotFoundException('Refresh token not found');
        }

        if (token.userId !== userId) {
            throw new UnauthorizedException('You can only revoke your own refresh tokens');
        }

        if (token.isRevoked) {
            throw new Error('Refresh token is already revoked');
        }

        await this.prisma.refreshToken.update({
            where: { id: tokenId },
            data: { isRevoked: true }
        });
    }

    /**
     * Revoke All User Refresh Tokens
     * Revokes all refresh tokens for a specific user
     * @param userId
     * @param exceptToken
     */
    async revokeAllUserRefreshTokens(userId: string, exceptToken?: string): Promise<void> {
        const whereClause: any = { userId };

        if (exceptToken) {
            whereClause.token = { not: exceptToken };
        }

        await this.prisma.refreshToken.updateMany({
            where: whereClause,
            data: { isRevoked: true }
        });
    }

    /**
     * Get User Refresh Tokens
     * Gets all active refresh tokens for a user
     * @param userId
     * @returns
     */
    async getUserRefreshTokens(userId: string): Promise<RefreshTokenInfo[]> {
        const tokens = await this.prisma.refreshToken.findMany({
            where: {
                userId,
                isRevoked: false,
                expiresAt: {
                    gt: new Date()
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return tokens.map(token => ({
            id: token.id,
            token: token.token.substring(0, 8) + '...', // Only show first 8 chars for security
            userId: token.userId,
            expiresAt: token.expiresAt,
            isRevoked: token.isRevoked,
            userAgent: token.userAgent,
            ipAddress: token.ipAddress,
            createdAt: token.createdAt
        }));
    }

    /**
     * Cleanup Expired Tokens
     * Removes expired refresh tokens
     * @returns
     */
    async cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
        const result = await this.prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { isRevoked: true }
                ]
            }
        });

        return { deletedCount: result.count };
    }

    /**
     * Get Token Statistics
     * Returns statistics about refresh tokens
     * @param userId
     * @returns
     */
    async getTokenStatistics(userId: string): Promise<{
        totalActive: number;
        totalRememberMe: number;
        oldestToken: Date | null;
        newestToken: Date | null;
    }> {
        const tokens = await this.prisma.refreshToken.findMany({
            where: {
                userId,
                isRevoked: false,
                expiresAt: { gt: new Date() }
            },
            select: {
                createdAt: true,
                expiresAt: true
            }
        });

        const now = new Date();
        const rememberMeTokens = tokens.filter(token => {
            const lifespan = token.expiresAt.getTime() - token.createdAt.getTime();
            return lifespan > (7 * 24 * 60 * 60 * 1000); // More than 7 days = Remember Me
        });

        return {
            totalActive: tokens.length,
            totalRememberMe: rememberMeTokens.length,
            oldestToken: tokens.length > 0 ?
                tokens.reduce((oldest, current) =>
                    current.createdAt < oldest.createdAt ? current : oldest
                ).createdAt : null,
            newestToken: tokens.length > 0 ?
                tokens.reduce((newest, current) =>
                    current.createdAt > newest.createdAt ? current : newest
                ).createdAt : null
        };
    }
}