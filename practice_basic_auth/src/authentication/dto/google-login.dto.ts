import { IsString, IsNotEmpty } from "class-validator";

export class GoogleLoginDto {
    @IsString({ message: 'Access token must be a string' })
    @IsNotEmpty({ message: 'Access token is required' })
    accessToken: string;
}