import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email: string;

    @IsString({ message: 'Password must be a string' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(100, { message: 'Password must not exceed 100 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    })
    password: string;

    @IsOptional()
    @IsString({ message: 'Username must be a string' })
    @MinLength(3, { message: 'Username must be at least 3 characters long' })
    @MaxLength(50, { message: 'Username must not exceed 50 characters' })
    username?: string;

    @IsOptional()
    @IsString({ message: 'First name must be a string' })
    @MaxLength(50, { message: 'First name must not exceed 50 characters' })
    firstName?: string;

    @IsOptional()
    @IsString({ message: 'Last name must be a string' })
    @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
    lastName?: string;

    @IsOptional()
    @IsString({ message: 'Phone must be a string' })
    @Matches(/^[\+]?[1-9][\d]{0,15}$/, { message: 'Please provide a valid phone number' })
    phone?: string;
}