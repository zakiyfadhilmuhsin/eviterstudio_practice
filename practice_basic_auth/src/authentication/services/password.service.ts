import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, Inject } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from '../dto';
import { EmailService } from 'src/email/interfaces/email.interface';

@Injectable()
export class PasswordService {
    /**
     * == Table of Contents ==
     * 
     * 1. Forgot Password
     * 2. Reset Password
     * 3. Change Password
     * 4. Helper Methods
     *   - Hash Password
     *   - Validate Password
     * 
     * =============================================
     */
    constructor(
        private usersService: UsersService,
        private prisma: PrismaService,
        @Inject('EmailService') private emailService: EmailService
    ) {}

    // =============================================
    // FORGOT PASSWORD
    // =============================================

    /**
     * Forgot Password
     * Initiate the forgot password process by generating a reset token and sending an email.
     * @param forgotPasswordDto 
     * @returns 
     */
    async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
        const { email } = forgotPasswordDto;

        const user = await this.usersService.findByEmail(email);
        if (!user) {
            // Return success even if user not found for security
            return { message: 'If the email exists, a reset link has been sent' };
        }

        // Generate reset token
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await this.prisma.passwordReset.create({
            data: {
                userId: user.id,
                token,
                expiresAt
            }
        });

        // Send password reset email
        const emailSent = await this.emailService.sendPasswordResetEmail(
            user.email,
            token,
            user.firstName || user.username
        );

        if (!emailSent) {
            // Log error but don't fail the process for security
            console.error(`Failed to send password reset email to ${user.email}`);
        }

        return { message: 'If the email exists, a reset link has been sent' };
    }

    // =============================================
    // RESET PASSWORD
    // =============================================

    /**
     * Reset Password
     * Reset the user's password using the provided reset token.
     * @param resetPasswordDto 
     * @returns 
     */
    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
        const { token, newPassword } = resetPasswordDto;

        const resetRecord = await this.prisma.passwordReset.findUnique({
            where: { token },
            include: { user: true }
        });

        if (!resetRecord || resetRecord.isUsed) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        if (resetRecord.expiresAt < new Date()) {
            throw new BadRequestException('Reset token has expired');
        }

        // Hash new password
        const passwordHash = await this.hashPassword(newPassword);

        // Update password (deactivate old passwords and create new one)
        await this.prisma.$transaction(async (tx) => {
            // Deactivate old passwords
            await tx.password.updateMany({
                where: {
                    userId: resetRecord.userId,
                    isActive: true
                },
                data: { isActive: false }
            });

            // Create new password
            await tx.password.create({
                data: {
                    userId: resetRecord.userId,
                    hash: passwordHash,
                    isActive: true
                }
            });

            // Mark reset token as used
            await tx.passwordReset.update({
                where: { id: resetRecord.id },
                data: { isUsed: true }
            });
        });

        return { message: 'Password reset successfully' };
    }

    // =============================================
    // CHANGE PASSWORD
    // =============================================

    /**
     * Change Password
     * Change the password for an authenticated user.
     * @param userId 
     * @param changePasswordDto 
     * @returns 
     */
    async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
        const { currentPassword, newPassword } = changePasswordDto;

        const user = await this.usersService.findByEmail(
            (await this.usersService.findById(userId))?.email || ''
        );

        if (!user || !user.passwords || user.passwords.length === 0) {
            throw new UnauthorizedException('Invalid user');
        }

        // Verify current password
        const activePassword = user.passwords[0];
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, activePassword.hash);

        if (!isCurrentPasswordValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        // Hash new password
        const passwordHash = await this.hashPassword(newPassword);

        // Update password
        await this.prisma.$transaction(async (tx) => {
            // Deactivate old passwords
            await tx.password.updateMany({
                where: {
                    userId,
                    isActive: true
                },
                data: { isActive: false }
            });

            // Create new password
            await tx.password.create({
                data: {
                    userId,
                    hash: passwordHash,
                    isActive: true
                }
            });
        });

        return { message: 'Password changed successfully' };
    }

    // =============================================
    // HELPER METHODS
    // =============================================
    
    /**
     * Hash Password
     * Hash a plain text password using bcrypt.
     * @param password 
     * @returns 
     */
    private async hashPassword(password: string): Promise<string> {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }

    /**
     * Validate Password
     * Validate a plain text password against a hashed password.
     * @param plainPassword 
     * @param hashedPassword 
     * @returns 
     */
    async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
}