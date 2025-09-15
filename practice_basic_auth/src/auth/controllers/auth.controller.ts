import { Body, Controller, Get, Post, Patch, Delete, Request, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
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
    ResendVerificationDto
} from "../dto";
import { GoogleAuthGuard } from "../guards/google-auth.guard";
import { AuthenticationService, EmailVerificationService, OAuthService, PasswordService, ProfileService } from "../services";

@Controller('auth')
export class AuthController {
    /**
     * 1. Register ✅
     * 2. Login
     *  2.a. Local (username/password) Strategy ✅
     *  2.b. OAuth (Google) Strategy - Token Login (Mobile/SPA)
     *  2.c. OAuth (Google) Strategy - Redirect Flow (Web)
     *  2.d. OAuth (Google) Strategy - Callback setelah user login di Google
     * 3. Logout
     * 4. Email / Phone Verification
     * 5. Forgot Password / Reset Password
     * 6. Change Password
     * 7. Two-Factor Authentication (2FA)
     * 8. Account Lockout / Rate Limiting
     * 9. Remember Me / Persistent Login
     * 10. Session Management
     * 11. Profile Management
     * 12. Account Deletion / Deactivation
     */
    constructor(
        private authenticationService: AuthenticationService,
        private passwordService: PasswordService,
        private oauthService: OAuthService,
        private emailVerificationService: EmailVerificationService,
        private profileService: ProfileService
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
    async login(@Body() loginDto: LoginDto, @Request() req) {
        // Passport local akan mengisi req.user jika valid
        return this.authenticationService.login(req.user);
    }

    // 2.b. OAuth (Google) Strategy - Token Login (Mobile/SPA)
    @Post('google')
    async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
        // Login menggunakan Google access token (untuk mobile/SPA)
        const user = await this.oauthService.verifyGoogleToken(googleLoginDto.accessToken);
        return this.authenticationService.login(user);
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
        return this.authenticationService.login(processedUser);
    }

    // =============================================
    // 3. LOGOUT
    // =============================================
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@Request() req) {
        const token = req.headers.authorization?.split(' ')[1];
        return this.authenticationService.logout(req.user.id, token);
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
    // TODO: Implement refresh token endpoints
    @Post('refresh')
    async refreshToken(@Body() body: { refreshToken: string }) {
        // TODO: Implement refresh token logic
        return { message: 'Refresh token feature coming soon' };
    }

    // =============================================
    // 10. SESSION MANAGEMENT
    // =============================================
    @Get('sessions')
    @UseGuards(JwtAuthGuard)
    async getSessions(@Request() req) {
        // TODO: Get all active sessions for user
        return { message: 'Session management coming soon' };
    }

    @Delete('sessions/:sessionId')
    @UseGuards(JwtAuthGuard)
    async revokeSession(@Request() req, @Body() body: { sessionId: string }) {
        // TODO: Revoke specific session
        return { message: 'Session revocation coming soon' };
    }

    @Delete('sessions/all')
    @UseGuards(JwtAuthGuard)
    async revokeAllSessions(@Request() req) {
        // TODO: Revoke all sessions except current
        return { message: 'Revoke all sessions coming soon' };
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
    async updateProfile(@Request() req, @Body() updateData: any) {
        // TODO: Implement profile update
        return { message: 'Profile update coming soon' };
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

/** 
    Catatan:
    Perbedaan antara kedua endpoint Google OAuth ini adalah:

    POST /auth/google (Token Login - Mobile/SPA)

    @Post('google')
    async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
        return this.authService.googleTokenLogin(googleLoginDto);
    }

    Digunakan untuk:
    - Mobile apps (Android/iOS)
    - Single Page Applications (React, Vue, Angular)
    - Desktop apps

    Cara kerja:
    1. Client sudah mendapatkan Google access token dari Google SDK
    2. Client mengirim token ke endpoint ini
    3. Server memverifikasi token langsung ke Google
    4. Server return JWT token untuk authentication

    Request body:
    {
        "accessToken": "ya29.a0AfH6SMC...",
        "idToken": "eyJhbGciOiJSUzI1NiIs..."
    }

    ---
    GET /auth/google (Redirect Flow - Web)

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth() {
        // Redirect ke Google OAuth
    }

    Digunakan untuk:
    - Web applications (traditional web apps)
    - Server-side rendered apps

    Cara kerja:
    1. User klik "Login with Google" di web
    2. Browser redirect ke Google OAuth page
    3. User login di Google
    4. Google redirect kembali ke /auth/google/callback
    5. Server process callback dan return JWT

    Flow:
    User → GET /auth/google → Redirect ke Google →
    Google login → Redirect ke /auth/google/callback → JWT token

    ---
    Kapan pakai yang mana?

    Gunakan POST (Token):
    - ✅ Mobile apps (React Native, Flutter)
    - ✅ SPA yang sudah ada Google SDK
    - ✅ Client sudah handle Google login sendiri

    Gunakan GET (Redirect):
    - ✅ Traditional web apps
    - ✅ Server-side rendered apps
    - ✅ Tidak mau implement Google SDK di frontend

    Kedua endpoint ini melengkapi satu sama lain untuk mendukung berbagai jenis aplikasi client.
 */