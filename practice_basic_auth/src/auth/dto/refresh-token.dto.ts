import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class RefreshTokenDto {
    @IsNotEmpty()
    @IsString()
    refreshToken: string;
}

export class LoginWithRememberMeDto {
    @IsNotEmpty()
    @IsString()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;

    @IsOptional()
    @IsBoolean()
    rememberMe?: boolean;
}

export class AuthResponseWithRefreshDto {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    remember_me: boolean;

    constructor(accessToken: string, refreshToken?: string, rememberMe: boolean = false) {
        this.access_token = accessToken;
        this.refresh_token = refreshToken;
        this.token_type = 'Bearer';
        this.expires_in = 3600; // 1 hour for access token
        this.remember_me = rememberMe;
    }
}