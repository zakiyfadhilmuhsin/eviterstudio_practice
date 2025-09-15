import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthResponseDto } from '../dto';

@Injectable()
export class OAuthService {
    /**
     * == Table of Contents ==
     * 
     * 1. Google OAuth Methods
     *    - Handle Google Callback
     *    - Verify Google Token (Alternative)
     * 2. Facebook OAuth Methods (Future Implementation)
     *    - Verify Facebook Token
     * 3. GitHub OAuth Methods (Future Implementation)
     *    - Verify GitHub Token
     * 4. OAuth Account Linking
     *    - Link OAuth Account
     *    - Unlink OAuth Account
     * 5. Helper Methods
     *    - Log Auth Event
     *    - Get Linked Accounts
     * 
     * =============================================
     */
    constructor(
        private usersService: UsersService,
        private prisma: PrismaService
    ) {}

    // =============================================
    // GOOGLE OAUTH METHODS
    // =============================================

    /**
     * Handle Google Callback
     * Handle Google OAuth redirect - called by Google Strategy
     * This method is already handled by the Google Strategy in validate() method
     * The controller just needs to call login() with req.user
     */
    async handleGoogleCallback(user: any): Promise<any> {
        // Log Google login event
        await this.logAuthEvent(user.id, 'google_login', true, {
            provider: 'google',
            email: user.email
        });

        return user; // Return user for main auth service to process
    }

    /**
     * Verify Google Token
     * Alternative: Direct Google token verification (for mobile/SPA)
     * If you want to support direct token verification from frontend
     */
    async verifyGoogleToken(accessToken: string): Promise<any> {
        try {
            // Verify Google token by calling Google's tokeninfo API
            const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`);
            const tokenInfo = await response.json();

            if (!response.ok || tokenInfo.error) {
                throw new UnauthorizedException('Invalid Google access token');
            }

            // Extract user info from token
            const { email, email_verified, sub } = tokenInfo;

            if (!email_verified) {
                throw new UnauthorizedException('Google email not verified');
            }

            // Find or create user
            let user = await this.usersService.findByOAuthProvider('google', sub);

            if (!user) {
                // Check if user exists with same email
                const existingUser = await this.usersService.findByEmail(email);

                if (existingUser) {
                    // User exists with email but no Google OAuth - add OAuth account
                    // For now, we'll treat them as different users for security
                    // In production, you might want to add a linking mechanism
                    user = await this.usersService.createUserWithOAuth({
                        email: `${email}.google`, // Append .google to avoid conflict
                        firstName: '', // Would get from People API
                        lastName: '',  // Would get from People API
                        avatar: '',    // Would get from People API
                        provider: 'google',
                        providerId: sub,
                        accessToken,
                        refreshToken: undefined
                    });
                } else {
                    // Create new user with OAuth
                    user = await this.usersService.createUserWithOAuth({
                        email,
                        firstName: '', // Would get from People API
                        lastName: '',  // Would get from People API
                        avatar: '',    // Would get from People API
                        provider: 'google',
                        providerId: sub,
                        accessToken,
                        refreshToken: undefined
                    });
                }
            } else {
                // Update last login for existing OAuth user
                await this.usersService.updateLastLogin(user.id);
            }

            // Log Google token login event
            await this.logAuthEvent(user.id, 'google_token_login', true, {
                provider: 'google',
                email: user.email
            });

            return user;

        } catch (error) {
            await this.logAuthEvent('unknown', 'google_token_login', false, {
                error: error.message,
                accessToken: accessToken.substring(0, 10) + '...' // Log partial token for debugging
            });
            throw new UnauthorizedException('Google authentication failed');
        }
    }

    // =============================================
    // FACEBOOK OAUTH METHODS (Future Implementation)
    // =============================================

    /**
     * Verify Facebook Token
     * Verify Facebook OAuth token and retrieve user info.
     * @param accessToken 
     */
    async verifyFacebookToken(accessToken: string): Promise<any> {
        // TODO: Implement Facebook OAuth token verification
        throw new Error('Facebook OAuth not implemented yet');
    }

    // =============================================
    // GITHUB OAUTH METHODS (Future Implementation)
    // =============================================

    /**
     * Verify GitHub Token
     * Verify GitHub OAuth token and retrieve user info.
     * @param accessToken 
     */
    async verifyGithubToken(accessToken: string): Promise<any> {
        // TODO: Implement GitHub OAuth token verification
        throw new Error('GitHub OAuth not implemented yet');
    }

    // =============================================
    // OAUTH ACCOUNT LINKING
    // =============================================

    /**
     * Link OAuth Account
     * Link an OAuth account (Google, Facebook, GitHub) to an existing user.
     * @param userId 
     * @param provider 
     * @param providerId 
     * @param tokens 
     * @returns 
     */
    async linkOAuthAccount(userId: string, provider: string, providerId: string, tokens: {
        accessToken?: string;
        refreshToken?: string;
    }): Promise<{ message: string }> {
        // Check if OAuth account already exists
        const existingOAuth = await this.prisma.oAuthAccount.findUnique({
            where: {
                provider_providerId: {
                    provider,
                    providerId
                }
            }
        });

        if (existingOAuth) {
            throw new UnauthorizedException('OAuth account already linked to another user');
        }

        // Link OAuth account to user
        await this.prisma.oAuthAccount.create({
            data: {
                userId,
                provider,
                providerId,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            }
        });

        return { message: `${provider} account linked successfully` };
    }

    /**
     * Unlink OAuth Account
     * Unlink an OAuth account from the user.
     * @param userId 
     * @param provider 
     * @returns 
     */
    async unlinkOAuthAccount(userId: string, provider: string): Promise<{ message: string }> {
        await this.prisma.oAuthAccount.deleteMany({
            where: {
                userId,
                provider
            }
        });

        return { message: `${provider} account unlinked successfully` };
    }

    // =============================================
    // HELPER METHODS
    // =============================================

    /**
     * Log Auth Event
     * Log authentication events for auditing.
     * @param userId 
     * @param action 
     * @param success 
     * @param details 
     */
    private async logAuthEvent(userId: string, action: string, success: boolean = true, details?: any): Promise<void> {
        await this.prisma.auditLog.create({
            data: {
                userId,
                action,
                success,
                details
            }
        });
    }

    /**
     * Get Linked Accounts
     * Retrieve linked OAuth accounts for a user.
     * @param userId 
     * @returns 
     */
    async getLinkedAccounts(userId: string) {
        return this.prisma.oAuthAccount.findMany({
            where: { userId },
            select: {
                provider: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }
}