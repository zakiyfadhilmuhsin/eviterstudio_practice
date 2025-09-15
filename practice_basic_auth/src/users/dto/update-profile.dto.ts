import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString({ message: 'Username must be a string' })
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

    @IsOptional()
    @IsString({ message: 'Avatar URL must be a string' })
    @MaxLength(500, { message: 'Avatar URL must not exceed 500 characters' })
    avatar?: string;
}