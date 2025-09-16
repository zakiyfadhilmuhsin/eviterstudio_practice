import { Body, Controller, Get, Post, Patch, Delete, Request, UseGuards, HttpCode, HttpStatus, Param } from "@nestjs/common";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { LocalAuthGuard } from "../guards/local-auth.guard";
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
    LoginWithRememberMeDto
} from "../dto";
import { GoogleAuthGuard } from "../guards/google-auth.guard";
import { AuthenticationService, EmailVerificationService, OAuthService, PasswordService, ProfileService, SessionService, RefreshTokenService } from "../services";

@Controller('auth')
export class AuthController {
    /**
     * 1. Register ✅
     * 2. Login
     *  2.a. Local (username/password) Strategy ✅
     *  2.b. OAuth (Google) Strategy - Token Login (Mobile/SPA)
     *  2.c. OAuth (Google) Strategy - Redirect Flow (Web)
     *  2.d. OAuth (Google) Strategy - Callback setelah user login di Google
     * 3. Logout ✅
     * 4. Email / Phone Verification
     *  4.a. Verify Email
     *  4.b. Resend Verification
     * 5. Forgot Password / Reset Password
     *  5.a. Forgot Password
     *  5.b. Reset Password
     * 6. Change Password
     * 7. Two-Factor Authentication (2FA)
     *  7.a. Enable 2FA
     *  7.b. Verify 2FA
     * 8. Account Lockout / Rate Limiting
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
     * 12. Account Deletion / Deactivation
     *  12.a. Deactivate Account
     *  12.b. Reactivate Account
     */
    constructor(
        private authenticationService: AuthenticationService,
        private passwordService: PasswordService,
        private oauthService: OAuthService,
        private emailVerificationService: EmailVerificationService,
        private profileService: ProfileService,
        private sessionService: SessionService,
        private refreshTokenService: RefreshTokenService
    ) {}

    // =============================================
    // 1. REGISTER
    // =============================================
    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authenticationService.register(registerDto);
    }

    // =============================================
    // 2. LOGIN
    // =============================================

    // 2.a. Local (username/password) Strategy
    @Post('login')
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
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.passwordService.forgotPassword(forgotPasswordDto);
    }

    @Post('reset-password')
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
    // 7. TWO-FACTOR AUTHENTICATION (2FA)
    // =============================================
    // TODO: Implement 2FA endpoints
    @Post('2fa/enable')
    @UseGuards(JwtAuthGuard)
    async enable2FA(@Request() req) {
        // TODO: Implement 2FA enable logic
        return { message: '2FA feature coming soon' };
    }

    @Post('2fa/verify')
    @UseGuards(JwtAuthGuard)
    async verify2FA(@Request() req, @Body() body: { token: string }) {
        // TODO: Implement 2FA verification logic
        return { message: '2FA verification coming soon' };
    }

    // =============================================
    // 8. ACCOUNT LOCKOUT / RATE LIMITING
    // =============================================
    // TODO: Implement with rate limiting middleware
    // This will be handled by rate limiting guards/middleware

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

    @Post('account/reactivate')
    async reactivateAccount(@Body() body: { email: string; token: string }) {
        // TODO: Implement account reactivation
        return { message: 'Account reactivation coming soon' };
    }
}