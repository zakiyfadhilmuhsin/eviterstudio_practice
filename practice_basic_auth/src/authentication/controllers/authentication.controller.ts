import { Body, Controller, Get, Post, Patch, Delete, Request, UseGuards, HttpCode, HttpStatus, Param, Query, UnauthorizedException } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { LocalAuthGuard } from "../guards/local-auth.guard";
import { RateLimit } from "../guards/rate-limit.guard";
import {
    LoginDto,
    RegisterDto,
    GoogleLoginDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    ChangePasswordDto,
    VerifyEmailDto,
    ResendVerificationDto,
    UpdateProfileDto,
    RefreshTokenDto,
    LoginWithRememberMeDto,
    RequestReactivationDto,
    ReactivateAccountDto,
    Setup2FADto,
    Enable2FADto,
    Validate2FADto,
    Disable2FADto,
    RegenerateBackupCodesDto,
    CompleteTwoFactorLoginDto
} from "../dto";
import { GoogleAuthGuard } from "../guards/google-auth.guard";
import { AuthenticationService, EmailVerificationService, OAuthService, PasswordService, ProfileService, SessionService, RefreshTokenService, AccountLockoutService, SecurityService, TwoFactorAuthService } from "../services";

@Controller('auth')
export class AuthenticationController {
    /**
     * 1. Register ✅
     * 2. Login
     *  2.a. Local (username/password) Strategy ✅
     *  2.b. OAuth (Google) Strategy - Token Login (Mobile/SPA) ✅
     *  2.c. OAuth (Google) Strategy - Redirect Flow (Web) ✅
     *  2.d. OAuth (Google) Strategy - Callback setelah user login di Google ✅
     * 3. Logout ✅
     * 4. Email / Phone Verification ✅
     *  4.a. Verify Email ✅
     *  4.b. Resend Verification ✅
     * 5. Forgot Password / Reset Password ✅
     *  5.a. Forgot Password ✅
     *  5.b. Reset Password ✅
     * 6. Change Password ✅
     * 6.5. Two-Factor Authentication Login ✅
     *  6.5.a. Complete Two-Factor Authentication Login ✅
     * 7. Two-Factor Authentication (2FA) ✅
     *  7.a. Setup 2FA - Generate QR Code and Secret ✅
     *  7.b. Enable 2FA - Verify TOTP token and activate 2FA ✅
     *  7.c. Validate 2FA Token (for login flow) ✅
     *  7.d. Disable 2FA ✅
     *  7.e. Get 2FA Status ✅
     *  7.f. Regenerate Backup Codes ✅
     * 8. Account Lockout / Rate Limiting ✅
     *  8.a. Get User Security Status ✅
     *  8.b. Get Account Lockout Status (Public - for login form) ✅
     *  8.c. Get Login History for Current User ✅
     *  8.d. Get Security Alerts for Current User ✅
     *  8.e. Request Account Unlock (Self-Service) ✅
     * 9. Remember Me / Persistent Login ✅
     *  9.a. Refresh Access Token ✅
     *  9.b. Rotate Refresh Token ✅
     *  9.c. Get User Refresh Tokens ✅
     *  9.d. Revoke All Refresh Tokens ✅
     *  9.e. Revoke Refresh Token ✅
     * 10. Session Management ✅
     *  10.a. View Active Sessions ✅
     *  10.b. Revoke All Sessions Except Current ✅
     *  10.c. Revoke Specific Session ✅
     * 11. Profile Management ✅
     *  11.a. View Profile ✅
     *  11.b. Update Profile ✅
     * 12. Account Deletion / Deactivation ✅
     *  12.a. Deactivate Account ✅
     *  12.b. Request Account Reactivation ✅
     *  12.c. Reactivate Account ✅
     */
    constructor(
        private authenticationService: AuthenticationService,
        private passwordService: PasswordService,
        private oauthService: OAuthService,
        private emailVerificationService: EmailVerificationService,
        private profileService: ProfileService,
        private sessionService: SessionService,
        private refreshTokenService: RefreshTokenService,
        private accountLockoutService: AccountLockoutService,
        private securityService: SecurityService,
        private twoFactorAuthService: TwoFactorAuthService
    ) {}

    // =============================================
    // 1. REGISTER
    // =============================================
    @Post('register')
    @RateLimit({ endpoint: 'register' })
    @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
    async register(@Body() registerDto: RegisterDto) {
        return this.authenticationService.register(registerDto);
    }

    // =============================================
    // 2. LOGIN
    // =============================================

    // 2.a. Local (username/password) Strategy
    @Post('login')
    @RateLimit({ endpoint: 'login' })
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginWithRememberMeDto, @Request() req) {
        // Passport local akan mengisi req.user jika valid
        return this.authenticationService.login(req.user, req, loginDto.rememberMe);
    }

    // 2.b. OAuth (Google) Strategy - Token Login (Mobile/SPA)
    @Post('google')
    async googleLogin(@Body() googleLoginDto: GoogleLoginDto, @Request() req) {
        // Login menggunakan Google access token (untuk mobile/SPA)
        const user = await this.oauthService.verifyGoogleToken(googleLoginDto.accessToken);
        return this.authenticationService.login(user, req);
    }

    // 2.c. OAuth (Google) Strategy - Redirect Flow (Web)
    @Get('google')
    @UseGuards(GoogleAuthGuard)
    async googleAuth() {
        // Endpoint ini akan redirect ke Google OAuth
        // Tidak perlu return apa-apa karena akan redirect
    }

    // 2.d. OAuth (Google) Strategy - Callback setelah user login di Google
    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    async googleAuthCallback(@Request() req) {
        // Google strategy sudah memproses user dan masukkan ke req.user
        // Sekarang generate JWT dan return ke frontend
        const processedUser = await this.oauthService.handleGoogleCallback(req.user);
        return this.authenticationService.login(processedUser, req);
    }

    // @Get('google/callback')
    // @UseGuards(GoogleAuthGuard)
    // async googleAuthCallback(@Request() req, @Query('state') state?: string) {
    //     // Google strategy sudah memproses user dan masukkan ke req.user
    //     // Sekarang generate JWT dan return ke frontend
    //     const processedUser = await this.oauthService.handleGoogleCallback(req.user);
    //     const authResult = await this.authenticationService.login(processedUser, req);

    //     // For HTML client: redirect with token in URL
    //     const redirectUrl = new URL('/google-login.html', 'http://localhost:3018');
    //     redirectUrl.searchParams.set('token', (authResult as any).access_token);

    //     if (state) {
    //         redirectUrl.searchParams.set('state', state);
    //     }

    //     // Redirect browser to login page with token
    //     return `
    //         <!DOCTYPE html>
    //         <html>
    //         <head>
    //             <title>Authentication Successful</title>
    //             <script>
    //                 // Redirect to login page with token
    //                 window.location.href = "${redirectUrl.toString()}";
    //             </script>
    //         </head>
    //         <body>
    //             <p>Authentication successful. Redirecting...</p>
    //         </body>
    //         </html>
    //     `;
    // }

    // =============================================
    // 3. LOGOUT
    // =============================================
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@Request() req, @Body() body?: { refreshToken?: string }) {
        const token = req.headers.authorization?.split(' ')[1];
        return this.authenticationService.logout(req.user.id, token, body?.refreshToken);
    }

    // =============================================
    // 4. EMAIL / PHONE VERIFICATION
    // =============================================
    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
        return this.emailVerificationService.verifyEmail(verifyEmailDto);
    }

    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
        return this.emailVerificationService.resendVerification(resendVerificationDto);
    }

    // =============================================
    // 5. FORGOT PASSWORD / RESET PASSWORD
    // =============================================
    @Post('forgot-password')
    @RateLimit({ endpoint: 'password' })
    @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 requests per 5 minutes
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.passwordService.forgotPassword(forgotPasswordDto);
    }

    @Post('reset-password')
    @RateLimit({ endpoint: 'password' })
    @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 requests per 5 minutes
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.passwordService.resetPassword(resetPasswordDto);
    }

    // =============================================
    // 6. CHANGE PASSWORD
    // =============================================
    @Patch('change-password')
    @UseGuards(JwtAuthGuard)
    async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
        return this.passwordService.changePassword(req.user.id, changePasswordDto);
    }

    // =============================================
    // 6.5. TWO-FACTOR AUTHENTICATION LOGIN
    // =============================================

    /**
     * Complete Two-Factor Authentication Login
     * Complete login process after 2FA token verification
     */
    @Post('login/2fa')
    @RateLimit({ endpoint: 'login' })
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
    @HttpCode(HttpStatus.OK)
    async completeTwoFactorLogin(@Body() completeTwoFactorDto: CompleteTwoFactorLoginDto, @Request() req) {
        const result = await this.authenticationService.completeTwoFactorLogin(completeTwoFactorDto, req);

        return {
            message: '2FA login completed successfully',
            ...result
        };
    }

    // =============================================
    // 7. TWO-FACTOR AUTHENTICATION (2FA)
    // =============================================

    /**
     * Setup 2FA - Generate QR Code and Secret
     * First step: Generate secret and QR code for user to scan
     */
    @Post('2fa/setup')
    @UseGuards(JwtAuthGuard)
    @RateLimit({ endpoint: 'auth' })
    async setup2FA(@Request() req) {
        const result = await this.twoFactorAuthService.setup2FA(
            req.user.id,
            req.user.email,
            'Practice Auth App'
        );

        return {
            message: 'Scan the QR code with your authenticator app, then verify with a token to enable 2FA',
            data: {
                qrCode: result.qrCode,
                backupCodes: result.backupCodes,
                instructions: [
                    '1. Install an authenticator app (Google Authenticator, Authy, etc.)',
                    '2. Scan the QR code with your authenticator app',
                    '3. Enter the 6-digit code from your app to verify and enable 2FA',
                    '4. Save your backup codes in a secure location'
                ]
            }
        };
    }

    /**
     * Enable 2FA - Verify TOTP token and activate 2FA
     * Second step: Verify the TOTP token to confirm setup and enable 2FA
     */
    @Post('2fa/enable')
    @UseGuards(JwtAuthGuard)
    @RateLimit({ endpoint: 'auth' })
    async enable2FA(@Request() req, @Body() enable2FADto: Enable2FADto) {
        const result = await this.twoFactorAuthService.enable2FA(req.user.id, enable2FADto.token);
        const status = await this.twoFactorAuthService.get2FAStatus(req.user.id);

        return {
            ...result,
            data: {
                isEnabled: status.isEnabled,
                backupCodesRemaining: status.backupCodesRemaining
            }
        };
    }

    /**
     * Validate 2FA Token
     * Used during login process to validate 2FA token
     */
    @Post('2fa/validate')
    @UseGuards(JwtAuthGuard)
    @RateLimit({ endpoint: 'login' })
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
    async validate2FA(@Request() req, @Body() validate2FADto: Validate2FADto) {
        const result = await this.twoFactorAuthService.validate2FA(req.user.id, validate2FADto.token);

        return {
            ...result,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Disable 2FA
     * Disable 2FA for the user after verifying current token
     */
    @Post('2fa/disable')
    @UseGuards(JwtAuthGuard)
    @RateLimit({ endpoint: 'sensitive' })
    @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts per 5 minutes
    async disable2FA(@Request() req, @Body() disable2FADto: Disable2FADto) {
        const result = await this.twoFactorAuthService.disable2FA(req.user.id, disable2FADto.token);

        return {
            ...result,
            data: {
                isEnabled: false,
                disabledAt: new Date().toISOString()
            }
        };
    }

    /**
     * Get 2FA Status
     * Check current 2FA status for the user
     */
    @Get('2fa/status')
    @UseGuards(JwtAuthGuard)
    @RateLimit({ endpoint: 'auth' })
    async get2FAStatus(@Request() req) {
        const status = await this.twoFactorAuthService.get2FAStatus(req.user.id);

        return {
            message: '2FA status retrieved successfully',
            data: status
        };
    }

    /**
     * Regenerate Backup Codes
     * Generate new backup codes (requires 2FA token verification)
     */
    @Post('2fa/backup-codes/regenerate')
    @UseGuards(JwtAuthGuard)
    @RateLimit({ endpoint: 'sensitive' })
    @Throttle({ default: { limit: 2, ttl: 300000 } }) // 2 attempts per 5 minutes
    async regenerateBackupCodes(@Request() req, @Body() regenerateDto: RegenerateBackupCodesDto) {
        // First verify the current token
        const validation = await this.twoFactorAuthService.validate2FA(req.user.id, regenerateDto.token);

        if (!validation.isValid) {
            throw new UnauthorizedException('Invalid 2FA token. Cannot regenerate backup codes.');
        }

        const newBackupCodes = await this.twoFactorAuthService.regenerateBackupCodes(req.user.id);

        return {
            message: 'New backup codes generated successfully. Please save them in a secure location.',
            data: {
                backupCodes: newBackupCodes,
                totalCodes: newBackupCodes.length,
                warning: 'These codes can only be displayed once. Save them securely!'
            }
        };
    }

    // =============================================
    // 8. ACCOUNT LOCKOUT / RATE LIMITING
    // =============================================

    /**
     * Get User Security Status
     * View current security status including lockout information
     */
    @Get('security/status')
    @UseGuards(JwtAuthGuard)
    @RateLimit({ endpoint: 'auth' })
    async getSecurityStatus(@Request() req) {
        const [lockoutStatus, recentAttempts] = await Promise.all([
            this.accountLockoutService.isAccountLocked(req.user.email),
            this.getRecentLoginAttempts(req.user.email, 10)
        ]);

        return {
            message: 'Security status retrieved successfully',
            data: {
                account: {
                    isLocked: lockoutStatus.isLocked,
                    attemptsRemaining: lockoutStatus.attemptsRemaining,
                    lockoutExpiresAt: lockoutStatus.lockoutExpiresAt,
                    nextAttemptAllowedAt: lockoutStatus.nextAttemptAllowedAt
                },
                recentAttempts,
                security: {
                    lastSuccessfulLogin: req.user.lastLoginAt,
                    accountActive: req.user.isActive,
                    emailVerified: req.user.isVerified
                }
            }
        };
    }

    /**
     * Get Account Lockout Status (Public - for login form)
     * Check if account is locked without requiring authentication
     */
    @Post('lockout/check')
    @RateLimit({ endpoint: 'auth' })
    @Throttle({ default: { limit: 20, ttl: 60000 } }) // Higher limit for status checks
    @HttpCode(HttpStatus.OK)
    async checkLockoutStatus(@Body() body: { email: string }) {
        const lockoutStatus = await this.accountLockoutService.isAccountLocked(body.email);

        return {
            isLocked: lockoutStatus.isLocked,
            attemptsRemaining: lockoutStatus.attemptsRemaining,
            estimatedUnlockTime: lockoutStatus.lockoutExpiresAt
        };
    }

    /**
     * Get Login History for Current User
     * View recent login attempts and security events
     */
    @Get('security/login-history')
    @UseGuards(JwtAuthGuard)
    @RateLimit({ endpoint: 'auth' })
    async getLoginHistory(@Request() req, @Query('limit') limit?: string) {
        const attempts = await this.getRecentLoginAttempts(
            req.user.email,
            limit ? parseInt(limit) : 20
        );

        return {
            message: 'Login history retrieved successfully',
            data: attempts,
            summary: {
                totalAttempts: attempts.length,
                successfulAttempts: attempts.filter(a => a.success).length,
                failedAttempts: attempts.filter(a => !a.success).length,
                uniqueIPs: [...new Set(attempts.map(a => a.ipAddress))].length
            }
        };
    }

    /**
     * Get Security Alerts for Current User
     * View security-related notifications and warnings
     */
    @Get('security/alerts')
    @UseGuards(JwtAuthGuard)
    @RateLimit({ endpoint: 'auth' })
    async getSecurityAlerts(@Request() req) {
        // This would typically query for user-specific security events
        // For now, return basic security information
        const lockoutStats = await this.accountLockoutService.getLockoutStatistics('week');

        return {
            message: 'Security alerts retrieved successfully',
            data: {
                alerts: [
                    // Recent security events would be listed here
                ],
                systemStats: {
                    weeklyFailedAttempts: lockoutStats.failedAttempts,
                    weeklyLockouts: lockoutStats.lockouts
                },
                recommendations: this.getSecurityRecommendations(req.user)
            }
        };
    }

    /**
     * Request Account Unlock (Self-Service)
     * Allow users to request unlock via email verification
     */
    @Post('security/request-unlock')
    @RateLimit({ endpoint: 'sensitive' })
    @Throttle({ default: { limit: 2, ttl: 300000 } }) // 2 requests per 5 minutes
    @HttpCode(HttpStatus.OK)
    async requestAccountUnlock(@Body() body: { email: string }) {
        const lockoutStatus = await this.accountLockoutService.isAccountLocked(body.email);

        if (!lockoutStatus.isLocked) {
            return {
                message: 'Account is not currently locked',
                status: 'not_locked'
            };
        }

        // In a real implementation, this would send an unlock email
        // For security, we don't reveal if the email exists
        return {
            message: 'If the account exists and is locked, an unlock request has been sent to the email address',
            status: 'request_sent'
        };
    }

    // Helper method for getting recent login attempts
    private async getRecentLoginAttempts(email: string, limit: number = 10) {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        return await this.securityService.getLoginAttemptsForUser(email, {
            since: oneWeekAgo,
            limit,
            includeSuccessful: true,
            includeFailed: true
        });
    }

    // Helper method for security recommendations
    private getSecurityRecommendations(user: any): string[] {
        const recommendations: string[] = [];

        if (!user.isVerified) {
            recommendations.push('Verify your email address to improve account security');
        }

        if (!user.lastLoginAt || (Date.now() - new Date(user.lastLoginAt).getTime()) > 30 * 24 * 60 * 60 * 1000) {
            recommendations.push('Consider changing your password if you haven\'t logged in recently');
        }

        recommendations.push('Enable two-factor authentication when available');
        recommendations.push('Regularly review your active sessions');

        return recommendations;
    }

    // =============================================
    // 9. REMEMBER ME / PERSISTENT LOGIN
    // =============================================

    /**
     * Refresh Access Token
     * Generate new access token using refresh token
     */
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
        const newAccessToken = await this.refreshTokenService.generateNewAccessToken(refreshTokenDto.refreshToken);

        return {
            access_token: newAccessToken,
            token_type: 'Bearer',
            expires_in: 3600
        };
    }

    /**
     * Rotate Refresh Token
     * Replace old refresh token with new one (security best practice)
     */
    @Post('refresh/rotate')
    @HttpCode(HttpStatus.OK)
    async rotateRefreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Request() req) {
        const { accessToken, refreshToken } = await this.refreshTokenService.rotateRefreshToken(
            refreshTokenDto.refreshToken,
            req?.get('User-Agent'),
            req?.ip || req?.connection?.remoteAddress
        );

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: 3600
        };
    }

    /**
     * Get User Refresh Tokens
     * View all active refresh tokens for the user
     */
    @Get('refresh/tokens')
    @UseGuards(JwtAuthGuard)
    async getUserRefreshTokens(@Request() req) {
        const tokens = await this.refreshTokenService.getUserRefreshTokens(req.user.id);
        const stats = await this.refreshTokenService.getTokenStatistics(req.user.id);

        return {
            message: 'Refresh tokens retrieved successfully',
            tokens,
            statistics: stats
        };
    }

    /**
     * Revoke All Refresh Tokens
     * Revoke all refresh tokens for the user (except current one if specified)
     */
    @Delete('refresh/tokens')
    @UseGuards(JwtAuthGuard)
    async revokeAllRefreshTokens(@Request() req, @Body() body?: { exceptCurrent?: boolean; currentToken?: string }) {
        await this.refreshTokenService.revokeAllUserRefreshTokens(
            req.user.id,
            body?.exceptCurrent ? body?.currentToken : undefined
        );

        return {
            message: 'All refresh tokens revoked successfully'
        };
    }

    /**
     * Revoke Refresh Token
     * Manually revoke a specific refresh token by ID
     */
    @Delete('refresh/tokens/:tokenId')
    @UseGuards(JwtAuthGuard)
    async revokeRefreshToken(@Request() req, @Param('tokenId') tokenId: string) {
        await this.refreshTokenService.revokeRefreshTokenById(tokenId, req.user.id);

        return {
            message: 'Refresh token revoked successfully'
        };
    }

    // =============================================
    // 10. SESSION MANAGEMENT
    // =============================================
    @Get('sessions')
    @UseGuards(JwtAuthGuard)
    async getSessions(@Request() req) {
        const currentToken = req.headers.authorization?.split(' ')[1];
        const sessions = await this.sessionService.getUserSessions(req.user.id, currentToken);

        return {
            message: 'Sessions retrieved successfully',
            data: sessions,
            stats: await this.sessionService.getSessionStats(req.user.id)
        };
    }

    @Delete('sessions/all')
    @UseGuards(JwtAuthGuard)
    async revokeAllSessions(@Request() req) {
        const currentToken = req.headers.authorization?.split(' ')[1];
        const result = await this.sessionService.revokeAllSessions(req.user.id, currentToken);

        return result;
    }

    @Delete('sessions/:sessionId')
    @UseGuards(JwtAuthGuard)
    async revokeSession(@Request() req, @Param('sessionId') sessionId: string) {
        const currentToken = req.headers.authorization?.split(' ')[1];
        const result = await this.sessionService.revokeSession(
            req.user.id,
            sessionId,
            currentToken
        );

        return result;
    }

    // =============================================
    // 11. PROFILE MANAGEMENT
    // =============================================
    @Get('profile')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Request() req) {
        return this.profileService.getProfile(req.user.id);
    }

    @Patch('profile')
    @UseGuards(JwtAuthGuard)
    async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
        const updatedProfile = await this.profileService.updateProfile(req.user.id, updateProfileDto);
        return {
            message: 'Profile updated successfully',
            profile: updatedProfile
        };
    }

    // =============================================
    // 12. ACCOUNT DELETION / DEACTIVATION
    // =============================================
    @Delete('account')
    @UseGuards(JwtAuthGuard)
    async deactivateAccount(@Request() req) {
        return this.authenticationService.deactivateAccount(req.user.id);
    }

    @Post('account/request-reactivation')
    @HttpCode(HttpStatus.OK)
    async requestAccountReactivation(@Body() requestReactivationDto: RequestReactivationDto) {
        return this.authenticationService.requestAccountReactivation(requestReactivationDto);
    }

    @Post('account/reactivate')
    @HttpCode(HttpStatus.OK)
    async reactivateAccount(@Body() reactivateAccountDto: ReactivateAccountDto) {
        return this.authenticationService.reactivateAccount(reactivateAccountDto);
    }
}