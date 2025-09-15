import { Injectable } from "@nestjs/common";
import {
    RegisterDto,
    AuthResponseDto,
    UserProfileDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    ChangePasswordDto,
    VerifyEmailDto,
    ResendVerificationDto
} from '../dto';

// Import specialized services
import { AuthenticationService } from './authentication.service';
import { PasswordService } from './password.service';
import { EmailVerificationService } from './email-verification.service';
import { OAuthService } from './oauth.service';
import { ProfileService } from './profile.service';

/**
 * Main Auth Service - Orchestrates authentication operations
 * Delegates specific tasks to specialized services
 */
@Injectable()
export class AuthService {
    constructor(
        private authenticationService: AuthenticationService,
        private passwordService: PasswordService,
        private emailVerificationService: EmailVerificationService,
        private oauthService: OAuthService,
        private profileService: ProfileService
    ) { }

    // =============================================
    // AUTHENTICATION METHODS
    // =============================================
    async register(registerDto: RegisterDto): Promise<{ message: string; user: UserProfileDto }> {
        return this.authenticationService.register(registerDto);
    }

    async login(user: any): Promise<AuthResponseDto> {
        return this.authenticationService.login(user);
    }

    async logout(userId: string, token: string): Promise<{ message: string }> {
        return this.authenticationService.logout(userId, token);
    }

    async deactivateAccount(userId: string): Promise<{ message: string }> {
        return this.authenticationService.deactivateAccount(userId);
    }

    // =============================================
    // PASSWORD METHODS
    // =============================================
    async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
        return this.passwordService.forgotPassword(forgotPasswordDto);
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
        return this.passwordService.resetPassword(resetPasswordDto);
    }

    async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
        return this.passwordService.changePassword(userId, changePasswordDto);
    }

    // =============================================
    // EMAIL VERIFICATION METHODS
    // =============================================
    async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
        return this.emailVerificationService.verifyEmail(verifyEmailDto);
    }

    async resendVerification(resendDto: ResendVerificationDto): Promise<{ message: string }> {
        return this.emailVerificationService.resendVerification(resendDto);
    }

    // =============================================
    // OAUTH METHODS
    // =============================================
    async googleAuthCallback(user: any): Promise<AuthResponseDto> {
        const processedUser = await this.oauthService.handleGoogleCallback(user);
        return this.authenticationService.login(processedUser);
    }

    async googleTokenLogin(googleLoginDto: { accessToken: string }): Promise<AuthResponseDto> {
        const user = await this.oauthService.verifyGoogleToken(googleLoginDto.accessToken);
        return this.authenticationService.login(user);
    }

    // =============================================
    // PROFILE METHODS
    // =============================================
    async getProfile(userId: string): Promise<UserProfileDto> {
        return this.profileService.getProfile(userId);
    }
}