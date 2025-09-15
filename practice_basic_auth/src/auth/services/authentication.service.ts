import { Injectable, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto, AuthResponseDto, UserProfileDto } from '../dto';
import { plainToInstance } from 'class-transformer';

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
        private configService: ConfigService
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

        // Generate email verification token
        // TODO: This should be handled by EmailVerificationService injection
        await this.generateEmailVerificationToken(newUser.id);

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
     * Authenticate user and return JWT token.
     * @param user 
     * @returns 
     */
    async login(user: any): Promise<AuthResponseDto> {
        const payload = {
            sub: user.id,
            email: user.email,
            isVerified: user.isVerified
        };

        const access_token = await this.jwtService.signAsync(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: '1h'
        });

        // Create session record
        await this.createSession(user.id, access_token);

        return new AuthResponseDto(access_token);
    }

    /**
     * Logout
     * Invalidate user session and revoke tokens.
     * @param userId 
     * @param token 
     * @returns 
     */
    async logout(userId: string, token: string): Promise<{ message: string }> {
        // Revoke the session
        await this.prisma.session.deleteMany({
            where: {
                userId,
                token
            }
        });

        // Revoke refresh token if exists
        await this.prisma.refreshToken.updateMany({
            where: { userId },
            data: { isRevoked: true }
        });

        return { message: 'Logged out successfully' };
    }

    // =============================================
    // ACCOUNT MANAGEMENT
    // =============================================

    /**
     * Deactivate Account
     * Soft delete the user account.
     * @param userId 
     * @returns 
     */
    async deactivateAccount(userId: string): Promise<{ message: string }> {
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

    // =============================================
    // HELPER METHODS
    // =============================================

    /**
     * Create Session
     * Create a new session record for the user.
     * @param userId 
     * @param token 
     */
    private async createSession(userId: string, token: string): Promise<void> {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await this.prisma.session.create({
            data: {
                userId,
                token,
                expiresAt
            }
        });
    }

    /**
     * Generate Email Verification Token
     * Generate and store an email verification token for the user.
     * @param userId 
     */
    // Simple token generation - in production, this should call EmailVerificationService
    private async generateEmailVerificationToken(userId: string): Promise<void> {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await this.prisma.emailVerification.create({
            data: {
                userId,
                token,
                expiresAt
            }
        });

        // TODO: Send verification email
        console.log(`Email verification token generated: ${token}`);
    }
}