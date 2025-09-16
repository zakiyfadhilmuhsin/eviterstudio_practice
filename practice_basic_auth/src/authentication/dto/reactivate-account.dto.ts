import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestReactivationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ReactivateAccountDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}