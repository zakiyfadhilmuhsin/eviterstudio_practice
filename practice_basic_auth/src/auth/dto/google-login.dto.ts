import { IsString } from "class-validator";

export class GoogleLoginDto {
    @IsString()
    accessToken: string; // Token dari Google
}