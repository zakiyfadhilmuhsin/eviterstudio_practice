import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

export interface TwoFactorSetupResult {
    secret: string;
    qrCode: string;
    backupCodes: string[];
}

export interface TwoFactorValidationResult {
    isValid: boolean;
    message: string;
}

@Injectable()
export class TwoFactorAuthService {
    /**
     * == Table of Contents ==
     * 
     * 1. Setup 2FA - Generate secret and QR code
     * 2. Enable 2FA - Verify TOTP token and activate 2FA
     * 3. Validate 2FA Token (for login flow)
     * 4. Disable 2FA
     * 5. Check if user has 2FA enabled
     * 6. Get 2FA status for user
     * 7. Regenerate Backup Codes
     * 
     * == Private Methods ==
     * 
     * a. Generate Backup Codes
     * b. Validate Backup Code
     * c. Encrypt Secret/Backup Codes
     * d. Decrypt Secret/Backup Codes
     * 
     * =======================================================
     */
    constructor(private prisma: PrismaService) {}

    /**
     * Setup 2FA for a user - generates secret and QR code
     */
    async setup2FA(userId: string, userEmail: string, appName: string = 'Practice Auth'): Promise<TwoFactorSetupResult> {
        // Check if user already has 2FA enabled
        const existing2FA = await this.prisma.twoFactorAuth.findUnique({
            where: { userId }
        });

        if (existing2FA && existing2FA.isEnabled) {
            throw new BadRequestException('2FA is already enabled for this user');
        }

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: userEmail,
            issuer: appName,
            length: 32
        });

        // Generate QR code
        const qrCode = await QRCode.toDataURL(secret.otpauth_url);

        // Generate backup codes
        const backupCodes = this.generateBackupCodes();

        // Save or update 2FA data (but don't enable yet)
        await this.prisma.twoFactorAuth.upsert({
            where: { userId },
            create: {
                userId,
                secret: this.encryptSecret(secret.base32),
                isEnabled: false,
                backupCodes: backupCodes.map(code => this.encryptSecret(code))
            },
            update: {
                secret: this.encryptSecret(secret.base32),
                backupCodes: backupCodes.map(code => this.encryptSecret(code)),
                updatedAt: new Date()
            }
        });

        return {
            secret: secret.base32,
            qrCode,
            backupCodes
        };
    }

    /**
     * Enable 2FA after verifying the TOTP token
     */
    async enable2FA(userId: string, token: string): Promise<{ success: boolean; message: string }> {
        const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
            where: { userId }
        });

        if (!twoFactorAuth) {
            throw new NotFoundException('2FA setup not found. Please setup 2FA first.');
        }

        if (twoFactorAuth.isEnabled) {
            throw new BadRequestException('2FA is already enabled');
        }

        // Verify the token
        const decryptedSecret = this.decryptSecret(twoFactorAuth.secret);
        const isValid = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token,
            window: 2 // Allow 2 time windows (30 seconds each)
        });

        if (!isValid) {
            throw new UnauthorizedException('Invalid 2FA token');
        }

        // Enable 2FA
        await this.prisma.twoFactorAuth.update({
            where: { userId },
            data: {
                isEnabled: true,
                lastUsedAt: new Date(),
                updatedAt: new Date()
            }
        });

        return {
            success: true,
            message: '2FA has been successfully enabled'
        };
    }

    /**
     * Validate 2FA token during login
     */
    async validate2FA(userId: string, token: string): Promise<TwoFactorValidationResult> {
        const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
            where: { userId }
        });

        if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
            return {
                isValid: false,
                message: '2FA is not enabled for this user'
            };
        }

        // Check if it's a backup code
        const isBackupCode = await this.validateBackupCode(userId, token);
        if (isBackupCode) {
            await this.prisma.twoFactorAuth.update({
                where: { userId },
                data: {
                    lastUsedAt: new Date(),
                    updatedAt: new Date()
                }
            });

            return {
                isValid: true,
                message: 'Backup code validated successfully'
            };
        }

        // Validate TOTP token
        const decryptedSecret = this.decryptSecret(twoFactorAuth.secret);
        const isValid = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token,
            window: 2
        });

        if (isValid) {
            await this.prisma.twoFactorAuth.update({
                where: { userId },
                data: {
                    lastUsedAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }

        return {
            isValid,
            message: isValid ? 'Token validated successfully' : 'Invalid 2FA token'
        };
    }

    /**
     * Disable 2FA for a user
     */
    async disable2FA(userId: string, token: string): Promise<{ success: boolean; message: string }> {
        const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
            where: { userId }
        });

        if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
            throw new BadRequestException('2FA is not enabled for this user');
        }

        // Verify the token before disabling
        const validation = await this.validate2FA(userId, token);
        if (!validation.isValid) {
            throw new UnauthorizedException('Invalid 2FA token. Cannot disable 2FA without valid token.');
        }

        // Disable 2FA
        await this.prisma.twoFactorAuth.update({
            where: { userId },
            data: {
                isEnabled: false,
                updatedAt: new Date()
            }
        });

        return {
            success: true,
            message: '2FA has been successfully disabled'
        };
    }

    /**
     * Check if user has 2FA enabled
     */
    async is2FAEnabled(userId: string): Promise<boolean> {
        const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
            where: { userId }
        });

        return twoFactorAuth?.isEnabled || false;
    }

    /**
     * Get 2FA status for user
     */
    async get2FAStatus(userId: string): Promise<{
        isEnabled: boolean;
        isSetup: boolean;
        lastUsedAt: Date | null;
        backupCodesRemaining: number;
    }> {
        const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
            where: { userId }
        });

        if (!twoFactorAuth) {
            return {
                isEnabled: false,
                isSetup: false,
                lastUsedAt: null,
                backupCodesRemaining: 0
            };
        }

        return {
            isEnabled: twoFactorAuth.isEnabled,
            isSetup: true,
            lastUsedAt: twoFactorAuth.lastUsedAt,
            backupCodesRemaining: twoFactorAuth.backupCodes.length
        };
    }

    /**
     * Generate new backup codes
     */
    async regenerateBackupCodes(userId: string): Promise<string[]> {
        const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
            where: { userId }
        });

        if (!twoFactorAuth) {
            throw new NotFoundException('2FA is not setup for this user');
        }

        const newBackupCodes = this.generateBackupCodes();

        await this.prisma.twoFactorAuth.update({
            where: { userId },
            data: {
                backupCodes: newBackupCodes.map(code => this.encryptSecret(code)),
                updatedAt: new Date()
            }
        });

        return newBackupCodes;
    }

    /**
     * Private: Generate backup codes
     */
    private generateBackupCodes(count: number = 8): string[] {
        const codes: string[] = [];

        for (let i = 0; i < count; i++) {
            // Generate 8-character alphanumeric code
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(code);
        }

        return codes;
    }

    /**
     * Private: Validate backup code
     */
    private async validateBackupCode(userId: string, code: string): Promise<boolean> {
        const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
            where: { userId }
        });

        if (!twoFactorAuth || !twoFactorAuth.backupCodes.length) {
            return false;
        }

        // Check if the code matches any backup code
        const encryptedCode = this.encryptSecret(code.toUpperCase());
        const codeIndex = twoFactorAuth.backupCodes.findIndex(
            backupCode => backupCode === encryptedCode
        );

        if (codeIndex === -1) {
            return false;
        }

        // Remove the used backup code
        const updatedBackupCodes = twoFactorAuth.backupCodes.filter((_, index) => index !== codeIndex);

        await this.prisma.twoFactorAuth.update({
            where: { userId },
            data: {
                backupCodes: updatedBackupCodes,
                updatedAt: new Date()
            }
        });

        return true;
    }

    /**
     * Private: Encrypt secret/backup codes
     */
    private encryptSecret(text: string): string {
        const algorithm = 'aes-256-cbc';
        const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32-chars';
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipher(algorithm, key);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * Private: Decrypt secret/backup codes
     */
    private decryptSecret(encryptedText: string): string {
        const algorithm = 'aes-256-cbc';
        const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32-chars';

        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedData = parts[1];

        const decipher = crypto.createDecipher(algorithm, key);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}