import { IsString, IsEmail } from 'class-validator';

export class VerifyEmailDto {
    @IsString({ message: 'Verification token must be a string' })
    token: string;
}

export class ResendVerificationDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email: string;
}