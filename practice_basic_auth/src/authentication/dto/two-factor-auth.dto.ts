import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class Setup2FADto {
    // No fields needed for setup - will use user from JWT
}

export class Enable2FADto {
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    @Matches(/^\d{6}$/, { message: 'Token must be exactly 6 digits' })
    token: string;
}

export class Validate2FADto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^(\d{6}|[A-F0-9]{8})$/, {
        message: 'Token must be either 6 digits (TOTP) or 8 characters (backup code)'
    })
    token: string;
}

export class Disable2FADto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^(\d{6}|[A-F0-9]{8})$/, {
        message: 'Token must be either 6 digits (TOTP) or 8 characters (backup code)'
    })
    token: string;
}

export class RegenerateBackupCodesDto {
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    @Matches(/^\d{6}$/, { message: 'Token must be exactly 6 digits' })
    token: string;
}

// Response DTOs
export class Setup2FAResponseDto {
    secret: string;
    qrCode: string;
    backupCodes: string[];
    message: string;
}

export class Enable2FAResponseDto {
    success: boolean;
    message: string;
    backupCodesRemaining: number;
}

export class Validate2FAResponseDto {
    isValid: boolean;
    message: string;
}

export class Disable2FAResponseDto {
    success: boolean;
    message: string;
}

export class TwoFactorStatusResponseDto {
    isEnabled: boolean;
    isSetup: boolean;
    lastUsedAt: Date | null;
    backupCodesRemaining: number;
}

export class RegenerateBackupCodesResponseDto {
    backupCodes: string[];
    message: string;
    totalCodes: number;
}

// Complete 2FA Login DTOs
export class CompleteTwoFactorLoginDto {
    @IsString()
    @IsNotEmpty()
    tempToken: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^(\d{6}|[A-F0-9]{8})$/, {
        message: 'Token must be either 6 digits (TOTP) or 8 characters (backup code)'
    })
    token: string;
}

export class TwoFactorLoginResponseDto {
    requiresTwoFactor: boolean;
    tempToken?: string;
    message: string;
    expiresIn?: number;
}