import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ForgotPasswordDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email: string;
}

export class ResetPasswordDto {
    @IsString({ message: 'Reset token must be a string' })
    token: string;

    @IsString({ message: 'Password must be a string' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(100, { message: 'Password must not exceed 100 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    })
    newPassword: string;
}

export class ChangePasswordDto {
    @IsString({ message: 'Current password must be a string' })
    currentPassword: string;

    @IsString({ message: 'New password must be a string' })
    @MinLength(8, { message: 'New password must be at least 8 characters long' })
    @MaxLength(100, { message: 'New password must not exceed 100 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    })
    newPassword: string;
}