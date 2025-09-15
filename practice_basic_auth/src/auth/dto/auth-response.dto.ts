import { Exclude, Expose } from 'class-transformer';

export class AuthResponseDto {
    @Expose()
    access_token: string;

    @Expose()
    token_type: string = 'Bearer';

    @Expose()
    expires_in: number = 3600; // 1 hour in seconds

    constructor(access_token: string) {
        this.access_token = access_token;
    }
}

export class UserProfileDto {
    @Expose()
    id: string;

    @Expose()
    email: string;

    @Expose()
    username?: string;

    @Expose()
    firstName?: string;

    @Expose()
    lastName?: string;

    @Expose()
    avatar?: string;

    @Expose()
    phone?: string;

    @Expose()
    isActive: boolean;

    @Expose()
    isVerified: boolean;

    @Expose()
    lastLoginAt?: Date;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    // Exclude sensitive data
    @Exclude()
    passwords?: any;
}