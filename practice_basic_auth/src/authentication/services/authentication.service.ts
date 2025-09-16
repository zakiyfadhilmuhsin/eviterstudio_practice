import { Injectable, ConflictException, Inject, forwardRef, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto, AuthResponseDto, AuthResponseWithRefreshDto, UserProfileDto, RequestReactivationDto, ReactivateAccountDto, TwoFactorLoginResponseDto, CompleteTwoFactorLoginDto } from '../dto';
import { plainToInstance } from 'class-transformer';
import { SessionService } from './session.service';
import { RefreshTokenService } from './refresh-token.service';
import { EmailVerificationService } from './email-verification.service';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { TempTokenService } from './temp-token.service';
import { EmailService } from 'src/email/interfaces/email.interface';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthenticationService {
    /**
     * == Table of Contents ==
     * 
     * 1. Registration
     *    - Register
     * 2. Login & Session Management
     *   - Login
     *   - Logout
     * 3. Account Management
     *   - Deactivate Account
     *   - Request Account Reactivation
     *   - Reactivate Account
     * 4. Helper Methods
     *   - Create Session
     *   - Generate Email Verification Token
     * 
     * =============================================
     */
    constructor(
        private usersService: UsersService,
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private sessionService: SessionService,
        private refreshTokenService: RefreshTokenService,
        private emailVerificationService: EmailVerificationService,
        private twoFactorAuthService: TwoFactorAuthService,
        private tempTokenService: TempTokenService,
        @Inject('EmailService') private emailService: EmailService
    ) {}

    // =============================================
    // REGISTRATION
    // =============================================

    /**
     * Register
     * Register a new user with email and password.
     * @param registerDto 
     * @returns 
     */
    async register(registerDto: RegisterDto): Promise<{ message: string; user: UserProfileDto }> {
        const { email, password, username, firstName, lastName, phone } = registerDto;

        // Check if user already exists
        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Check if username is taken (if provided)
        if (username) {
            const existingUsername = await this.prisma.user.findUnique({
                where: { username }
            });
            if (existingUsername) {
                throw new ConflictException('Username already taken');
            }
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const newUser = await this.usersService.createUser({
            email,
            username,
            firstName,
            lastName,
            passwordHash
        });

        // Generate email verification token and send verification email
        await this.emailVerificationService.generateEmailVerificationToken(
            newUser.id,
            newUser.email,
            newUser.firstName || newUser.username
        );

        const userProfile = plainToInstance(UserProfileDto, newUser, {
            excludeExtraneousValues: true
        });

        return {
            message: 'Registration successful. Please check your email to verify your account.',
            user: userProfile
        };
    }

    // =============================================
    // LOGIN & SESSION MANAGEMENT
    // =============================================

    /**
     * Login
     * Authenticate user and return JWT token with optional refresh token.
     * If user has 2FA enabled, returns temporary token for 2FA verification.
     * @param user
     * @param req - Optional request object for session data
     * @param rememberMe - Optional remember me flag for refresh token
     * @returns
     */
    async login(user: any, req?: any, rememberMe: boolean = false): Promise<AuthResponseDto | AuthResponseWithRefreshDto | TwoFactorLoginResponseDto> {
        // Check if user has 2FA enabled
        const is2FAEnabled = await this.twoFactorAuthService.is2FAEnabled(user.id);

        if (is2FAEnabled) {
            // Generate temporary token for 2FA flow
            const tempToken = await this.tempTokenService.generateTempToken(
                user.id,
                user.email
            );

            return {
                requiresTwoFactor: true,
                tempToken,
                message: 'Please provide your 2FA code to complete login',
                expiresIn: 300 // 5 minutes
            } as TwoFactorLoginResponseDto;
        }

        // Standard login flow for users without 2FA
        return await this.completeLogin(user, req, rememberMe);
    }

    /**
     * Complete login after 2FA verification or for users without 2FA
     * @param user
     * @param req
     * @param rememberMe
     * @returns
     */
    async completeLogin(user: any, req?: any, rememberMe: boolean = false): Promise<AuthResponseDto | AuthResponseWithRefreshDto> {
        const payload = {
            sub: user.id,
            email: user.email,
            isVerified: user.isVerified
        };

        const access_token = await this.jwtService.signAsync(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: '1h'
        });

        // Create session record with enhanced data
        await this.sessionService.createSession({
            userId: user.id,
            token: access_token,
            userAgent: req?.get('User-Agent'),
            ipAddress: req?.ip || req?.connection?.remoteAddress
        });

        // Update user's last login time
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });

        // Create refresh token if rememberMe is enabled
        if (rememberMe) {
            const refreshToken = await this.refreshTokenService.createRefreshToken({
                userId: user.id,
                rememberMe: true,
                userAgent: req?.get('User-Agent'),
                ipAddress: req?.ip || req?.connection?.remoteAddress
            });

            return new AuthResponseWithRefreshDto(access_token, refreshToken, true);
        }

        return new AuthResponseDto(access_token);
    }

    /**
     * Complete Two-Factor Authentication Login
     * Verify 2FA token and complete the login process
     * @param completeTwoFactorDto
     * @param req
     * @returns
     */
    async completeTwoFactorLogin(
        completeTwoFactorDto: CompleteTwoFactorLoginDto,
        req?: any
    ): Promise<AuthResponseDto | AuthResponseWithRefreshDto> {
        const { tempToken, token } = completeTwoFactorDto;

        // Verify temporary token
        const tempTokenData = await this.tempTokenService.verifyTempToken(tempToken);
        if (!tempTokenData) {
            throw new BadRequestException('Invalid or expired temporary token');
        }

        // Get user
        const user = await this.usersService.findById(tempTokenData.userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Validate 2FA token
        const validation = await this.twoFactorAuthService.validate2FA(user.id, token);
        if (!validation.isValid) {
            throw new BadRequestException(validation.message || 'Invalid 2FA token');
        }

        // Invalidate temporary token
        await this.tempTokenService.invalidateTempToken(tempToken);

        // Complete login (check if original login had rememberMe from temp token data)
        // For now, we'll default to false since we don't store rememberMe in temp token
        // This could be enhanced to store rememberMe preference in the temp token
        return await this.completeLogin(user, req, false);
    }

    /**
     * Logout
     * Invalidate user session and revoke tokens.
     * @param userId
     * @param token
     * @param refreshToken - Optional refresh token to revoke specific token
     * @returns
     */
    async logout(userId: string, token: string, refreshToken?: string): Promise<{ message: string }> {
        // Revoke the session
        await this.prisma.session.deleteMany({
            where: {
                userId,
                token
            }
        });

        // Revoke specific refresh token if provided, otherwise revoke all
        if (refreshToken) {
            await this.refreshTokenService.revokeRefreshToken(refreshToken);
        } else {
            await this.refreshTokenService.revokeAllUserRefreshTokens(userId);
        }

        return { message: 'Logged out successfully' };
    }

    // =============================================
    // ACCOUNT MANAGEMENT
    // =============================================

    /**
     * Deactivate Account
     * Soft delete the user account with proper validation.
     * @param userId
     * @returns
     */
    async deactivateAccount(userId: string): Promise<{ message: string }> {
        // Validate user exists first
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if user is already inactive
        if (!user.isActive) {
            throw new BadRequestException('User account is already deactivated');
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { isActive: false }
        });

        // Revoke all sessions and tokens
        await this.prisma.session.deleteMany({
            where: { userId }
        });

        await this.prisma.refreshToken.updateMany({
            where: { userId },
            data: { isRevoked: true }
        });

        return { message: 'Account deactivated successfully' };
    }

    /**
     * Request Account Reactivation
     * Generate and send reactivation token to user's email
     * @param requestReactivationDto
     * @returns
     */
    async requestAccountReactivation(requestReactivationDto: RequestReactivationDto): Promise<{ message: string }> {
        const { email } = requestReactivationDto;

        const user = await this.usersService.findByEmail(email);
        if (!user) {
            // Return success even if user not found for security
            return { message: 'If the account exists and is deactivated, a reactivation link has been sent' };
        }

        // Only send reactivation email if account is actually deactivated
        if (user.isActive) {
            // Don't reveal that account is already active
            return { message: 'If the account exists and is deactivated, a reactivation link has been sent' };
        }

        // Generate reactivation token
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Delete any existing reactivation tokens for this user
        await this.prisma.accountReactivation.deleteMany({
            where: { userId: user.id }
        });

        // Create new reactivation token
        await this.prisma.accountReactivation.create({
            data: {
                userId: user.id,
                token,
                expiresAt
            }
        });

        // Send reactivation email
        const emailSent = await this.emailService.sendAccountReactivationEmail(
            user.email,
            token,
            user.firstName || user.username
        );

        if (!emailSent) {
            // Log error but don't fail the process for security
            console.error(`Failed to send reactivation email to ${user.email}`);
        }

        return { message: 'If the account exists and is deactivated, a reactivation link has been sent' };
    }

    /**
     * Reactivate Account
     * Reactivate user account using the provided reactivation token
     * @param reactivateAccountDto
     * @returns
     */
    async reactivateAccount(reactivateAccountDto: ReactivateAccountDto): Promise<{ message: string }> {
        const { email, token } = reactivateAccountDto;

        const reactivationRecord = await this.prisma.accountReactivation.findUnique({
            where: { token },
            include: { user: true }
        });

        if (!reactivationRecord || reactivationRecord.isUsed) {
            throw new BadRequestException('Invalid or expired reactivation token');
        }

        if (reactivationRecord.expiresAt < new Date()) {
            throw new BadRequestException('Reactivation token has expired');
        }

        // Verify email matches the token's user
        if (reactivationRecord.user.email !== email) {
            throw new BadRequestException('Invalid reactivation request');
        }

        // Reactivate account
        await this.prisma.$transaction(async (tx) => {
            // Set user as active
            await tx.user.update({
                where: { id: reactivationRecord.userId },
                data: { isActive: true }
            });

            // Mark reactivation token as used
            await tx.accountReactivation.update({
                where: { id: reactivationRecord.id },
                data: { isUsed: true }
            });
        });

        return { message: 'Account reactivated successfully. You can now log in.' };
    }

    // =============================================
    // HELPER METHODS
    // =============================================

}