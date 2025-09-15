import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email: string;

    @IsString({ message: 'Password must be a string' })
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    @MaxLength(100, { message: 'Password must not exceed 100 characters' })
    password: string;
}