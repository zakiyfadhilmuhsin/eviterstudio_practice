import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Password } from '@prisma/client';

export interface UserWithPassword extends User {
    passwords: Password[];
}

@Injectable()
export class UsersService {
    /**
     * == Table of Contents ==
     * 
     * 1. findByEmail
     * 2. findById
     * 3. createUser
     * 4. updateLastLogin
     * 5. verifyUser
     * 6. findByOAuthProvider
     * 7. createUserWithOAuth
     * 
     * ========================
     */
    constructor(private prisma: PrismaService) { }

    /**
     * Find By Email
     * Retrieves a user by their email address, including their active password.
     * @param email 
     * @returns 
     */
    async findByEmail(email: string): Promise<UserWithPassword | null> {
        return this.prisma.user.findUnique({
            where: { email },
            include: {
                passwords: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
    }

    /**
     * Find By ID
     * Retrieves a user by their unique ID.
     * @param id 
     * @returns 
     */
    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    /**
     * Create User
     * Creates a new user with the provided data and an associated password hash.
     * @param data 
     * @returns 
     */
    async createUser(data: {
        email: string;
        username?: string;
        firstName?: string;
        lastName?: string;
        passwordHash: string;
    }): Promise<User> {
        const { passwordHash, ...userData } = data;

        return this.prisma.user.create({
            data: {
                ...userData,
                passwords: {
                    create: {
                        hash: passwordHash,
                        isActive: true,
                    },
                },
            },
        });
    }

    /**
     * Update Last Login
     * Updates the last login timestamp for a user.
     * @param id 
     */
    async updateLastLogin(id: string): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: { lastLoginAt: new Date() },
        });
    }

    /**
     * Verify User
     * Marks a user as verified.
     * @param id 
     */
    async verifyUser(id: string): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: { isVerified: true },
        });
    }
    
    /**
     * Find By OAuth Provider
     * Retrieves a user associated with a specific OAuth provider and provider ID.
     * @param provider 
     * @param providerId 
     * @returns 
     */
    async findByOAuthProvider(
        provider: string,
        providerId: string,
    ): Promise<User | null> {
        const oauthAccount = await this.prisma.oAuthAccount.findUnique({
            where: {
                provider_providerId: {
                    provider,
                    providerId,
                },
            },
            include: {
                user: true,
            },
        });

        return oauthAccount?.user || null;
    }

    /**
     * Create User With OAuth
     * Creates a new user using OAuth provider data and links the OAuth account.
     * @param userData 
     * @returns 
     */
    async createUserWithOAuth(userData: {
        email: string;
        firstName?: string;
        lastName?: string;
        avatar?: string;
        provider: string;
        providerId: string;
        accessToken?: string;
        refreshToken?: string;
    }): Promise<User> {
        const { provider, providerId, accessToken, refreshToken, ...userInfo } =
            userData;

        return this.prisma.user.create({
            data: {
                ...userInfo,
                isVerified: true, // OAuth users are considered verified
                oauthAccounts: {
                    create: {
                        provider,
                        providerId,
                        accessToken,
                        refreshToken,
                    },
                },
            },
        });
    }
}
