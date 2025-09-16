import { IsOptional, IsString, IsEmail, MaxLength, MinLength, Matches } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(3, { message: 'Username must be at least 3 characters long' })
    @MaxLength(20, { message: 'Username must not exceed 20 characters' })
    @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
    username?: string;

    @IsOptional()
    @IsString()
    @MinLength(1, { message: 'First name cannot be empty' })
    @MaxLength(50, { message: 'First name must not exceed 50 characters' })
    firstName?: string;

    @IsOptional()
    @IsString()
    @MinLength(1, { message: 'Last name cannot be empty' })
    @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
    lastName?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Phone number must be a valid international format' })
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500, { message: 'Avatar URL must not exceed 500 characters' })
    avatar?: string;
}