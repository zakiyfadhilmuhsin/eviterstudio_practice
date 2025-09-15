import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomBytes } from 'crypto';
import { VerifyEmailDto, ResendVerificationDto } from '../dto';

@Injectable()
export class EmailVerificationService {
    /**
     * == Table of Contents ==
     * 
     * 1. Email Verification
     *   - Verify Email
     *   - Resend Verification
     * 2. Helper Methods
     *   - Generate Email Verification Token
     *   - Is Email Verified
     *   - Cleanup Expired Tokens
     * 
     * =============================================
     */
    constructor(
        private usersService: UsersService,
        private prisma: PrismaService
    ) {}

    // =============================================
    // EMAIL VERIFICATION
    // =============================================

    /**
     * Verify Email
     * Verify user's email using the provided token.
     * @param verifyEmailDto 
     * @returns 
     */
    async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
        const { token } = verifyEmailDto;

        const verification = await this.prisma.emailVerification.findUnique({
            where: { token },
            include: { user: true }
        });

        if (!verification) {
            throw new BadRequestException('Invalid verification token');
        }

        if (verification.expiresAt < new Date()) {
            throw new BadRequestException('Verification token has expired');
        }

        // Verify user
        await this.usersService.verifyUser(verification.userId);

        // Delete verification token
        await this.prisma.emailVerification.delete({
            where: { id: verification.id }
        });

        return { message: 'Email verified successfully' };
    }

    /**
     * Resend Verification
     * Resend the email verification token to the user's email.
     * @param resendDto 
     * @returns 
     */
    async resendVerification(resendDto: ResendVerificationDto): Promise<{ message: string }> {
        const { email } = resendDto;

        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.isVerified) {
            throw new BadRequestException('Email is already verified');
        }

        // Delete existing verification tokens
        await this.prisma.emailVerification.deleteMany({
            where: { userId: user.id }
        });

        // Generate new verification token
        await this.generateEmailVerificationToken(user.id);

        return { message: 'Verification email sent' };
    }

    // =============================================
    // HELPER METHODS
    // =============================================

    /**
     * Generate Email Verification Token
     * Generate and store an email verification token for the user.
     * @param userId 
     * @returns 
     */
    async generateEmailVerificationToken(userId: string): Promise<string> {
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await this.prisma.emailVerification.create({
            data: {
                userId,
                token,
                expiresAt
            }
        });

        // TODO: Send verification email
        // await this.emailService.sendVerificationEmail(user.email, token);

        return token;
    }

    /**
     * Is Email Verified
     * Check if the user's email is verified.
     * @param userId 
     * @returns 
     */
    async isEmailVerified(userId: string): Promise<boolean> {
        const user = await this.usersService.findById(userId);
        return user?.isVerified || false;
    }

    /**
     * Cleanup Expired Tokens
     * Remove expired email verification tokens from the database.
     * @returns
     */
    async cleanupExpiredTokens(): Promise<void> {
        await this.prisma.emailVerification.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });
    }
}