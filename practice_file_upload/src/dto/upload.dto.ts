import { IsString, IsNumber, IsArray, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { FileResponseDto } from './file.dto';

export class UploadResponseDto {
    @IsString()
    id: string;

    @IsArray()
    @Type(() => FileResponseDto)
    files: FileResponseDto[];

    @IsString()
    status: 'pending' | 'completed' | 'failed';

    @IsNumber()
    totalFiles: number;

    @IsDateString()
    createdAt: string;

    @IsDateString()
    updatedAt: string;
}

export class CreateUploadDto {
    @IsString()
    status: 'pending' | 'completed' | 'failed';

    @IsNumber()
    totalFiles: number;
}

export class SingleUploadResponseDto {
    @Type(() => FileResponseDto)
    file: FileResponseDto;

    @IsString()
    message: string;
}

export class MultipleUploadResponseDto {
    @IsArray()
    @Type(() => FileResponseDto)
    files: FileResponseDto[];

    @IsString()
    uploadId: string;

    @IsString()
    message: string;

    @IsNumber()
    totalFiles: number;
}

export class UploadProgressDto {
    @IsString()
    uploadId: string;

    @IsNumber()
    totalFiles: number;

    @IsNumber()
    completedFiles: number;

    @IsNumber()
    failedFiles: number;

    @IsString()
    status: 'pending' | 'completed' | 'failed';

    @IsOptional()
    @IsArray()
    errors?: string[];
}