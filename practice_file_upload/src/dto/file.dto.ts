import { IsString, IsNumber, IsDateString, IsOptional, IsUrl } from 'class-validator';

export class FileResponseDto {
    @IsString()
    id: string;

    @IsString()
    filename: string;

    @IsString()
    mimetype: string;

    @IsNumber()
    size: number;

    @IsUrl()
    url: string;

    @IsString()
    key: string;

    @IsString()
    bucket: string;

    @IsString()
    uploadType: string;

    @IsOptional()
    @IsString()
    uploadId?: string;

    @IsDateString()
    uploadedAt: string;

    @IsDateString()
    createdAt: string;

    @IsDateString()
    updatedAt: string;
}

export class CreateFileDto {
    @IsString()
    filename: string;

    @IsString()
    mimetype: string;

    @IsNumber()
    size: number;

    @IsUrl()
    url: string;

    @IsString()
    key: string;

    @IsString()
    bucket: string;

    @IsString()
    uploadType: 'single' | 'multiple';

    @IsOptional()
    @IsString()
    uploadId?: string;
}