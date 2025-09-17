import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
    Paginate,
    PaginationParams,
    ApiResponse,
    ApiSuccessResponse,
    ApiCreatedResponse,
    PaginationOptions,
    PaginatedResult
} from 'eviterstudio-framework-nestjs';
import { UploadService } from '../services/upload.service';
import { SingleUploadResponseDto, MultipleUploadResponseDto, UploadResponseDto } from '../dto/upload.dto';
import { FileResponseDto } from '../dto/file.dto';

@Controller('upload')
export class UploadController {
    private readonly logger = new Logger(UploadController.name);

    constructor(private readonly uploadService: UploadService) { }

    /**
     * Upload Single File
     * @param file
     * @returns
     */
    @Post('single')
    @ApiCreatedResponse('File uploaded successfully')
    @UseInterceptors(FileInterceptor('file'))
    async uploadSingleFile(
        @UploadedFile() file: Express.Multer.File,
    ): Promise<SingleUploadResponseDto> {
        this.logger.log('Single file upload request received');

        if (!file) {
            throw new BadRequestException('No file provided');
        }

        return this.uploadService.uploadSingleFile(file);
    }

    /**
     * Upload Multiple Files
     * @param files
     * @returns
     */
    @Post('multiple')
    @ApiCreatedResponse('Multiple files uploaded successfully')
    @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
    async uploadMultipleFiles(
        @UploadedFiles() files: Express.Multer.File[],
    ): Promise<MultipleUploadResponseDto> {
        this.logger.log(`Multiple files upload request received: ${files?.length || 0} files`);

        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }

        return this.uploadService.uploadMultipleFiles(files);
    }

    /**
     * Get Upload by ID
     * @param id
     * @returns
     */
    @Get('upload/:id')
    @ApiSuccessResponse('Upload retrieved successfully')
    async getUpload(@Param('id') id: string): Promise<UploadResponseDto> {
        this.logger.log(`Get upload request: ${id}`);
        return this.uploadService.getUploadById(id);
    }

    /**
     * Get File by ID
     * @param id
     * @returns
     */
    @Get('file/:id')
    @ApiSuccessResponse('File retrieved successfully')
    async getFile(@Param('id') id: string): Promise<FileResponseDto> {
        this.logger.log(`Get file request: ${id}`);
        return this.uploadService.getFileById(id);
    }

    /**
     * Delete File by ID
     * @param id
     * @returns
     */
    @Delete('file/:id')
    @ApiSuccessResponse('File deleted successfully')
    async deleteFile(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
        this.logger.log(`Delete file request: ${id}`);
        return this.uploadService.deleteFile(id);
    }

    /**
     * Get All Files with Pagination
     * @param paginationOptions
     * @returns
     */
    @Get('files')
    @Paginate()
    @ApiSuccessResponse('Files retrieved successfully')
    async getAllFiles(
        @PaginationParams() paginationOptions: PaginationOptions,
    ): Promise<PaginatedResult<FileResponseDto>> {
        this.logger.log(`Get all files request: page=${paginationOptions.page}, limit=${paginationOptions.limit}`);

        return this.uploadService.getAllFiles(paginationOptions);
    }

    /**
     * Get All Uploads with Pagination
     * @param paginationOptions
     * @returns
     */
    @Get('uploads')
    @Paginate()
    @ApiSuccessResponse('Uploads retrieved successfully')
    async getAllUploads(
        @PaginationParams() paginationOptions: PaginationOptions,
    ): Promise<PaginatedResult<UploadResponseDto>> {
        this.logger.log(`Get all uploads request: page=${paginationOptions.page}, limit=${paginationOptions.limit}`);

        return this.uploadService.getAllUploads(paginationOptions);
    }

    /**
     * Health Check Endpoint
     * @returns
     */
    @Get('health')
    @ApiSuccessResponse('Service health status')
    async healthCheck(): Promise<{ status: string; timestamp: string }> {
        return {
            status: 'Upload service is running',
            timestamp: new Date().toISOString(),
        };
    }
}