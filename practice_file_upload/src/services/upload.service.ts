import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaginationService, PaginationOptions, PaginatedResult } from 'eviterstudio-framework-core';
import { PrismaService } from './prisma.service';
import { SpacesService } from './spaces.service';
import { FileValidator } from '../validators/file.validator';
import { CreateFileDto, FileResponseDto } from '../dto/file.dto';
import { CreateUploadDto, UploadResponseDto, SingleUploadResponseDto, MultipleUploadResponseDto } from '../dto/upload.dto';

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);

    /**
     * == Table of Contents ==
     * 
     * 1. uploadSingleFile
     * 2. uploadMultipleFiles
     * 3. getUploadById
     * 4. getFileById
     * 5. deleteFile
     * 6. getAllFiles
     * 7. getAllUploads
     * 8. mapFileToDto
     * 
     * ======================= 
     */
    constructor(
        private readonly prisma: PrismaService,
        private readonly spacesService: SpacesService,
        private readonly configService: ConfigService,
        private readonly paginationService: PaginationService,
    ) { }

    /**
     * Upload Single File
     * @param file 
     * @returns 
     */
    async uploadSingleFile(file: Express.Multer.File): Promise<SingleUploadResponseDto> {
        try {
            const uploadConfig = this.configService.get('upload');

            // Validate file
            FileValidator.validateFile(file, uploadConfig.allowedMimeTypes, uploadConfig.maxFileSize);

            // Upload to DigitalOcean Spaces
            const uploadResult = await this.spacesService.uploadFile(file, 'uploads');

            // Save to database
            const savedFile = await this.prisma.file.create({
                data: {
                    filename: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    url: uploadResult.url,
                    key: uploadResult.key,
                    bucket: uploadResult.bucket,
                    uploadType: 'single',
                },
            });

            this.logger.log(`Single file uploaded successfully: ${savedFile.id}`);

            return {
                file: this.mapFileToDto(savedFile),
                message: 'File uploaded successfully',
            };
        } catch (error) {
            this.logger.error(`Single file upload failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Upload Multiple Files
     * @param files 
     * @returns 
     */
    async uploadMultipleFiles(files: Express.Multer.File[]): Promise<MultipleUploadResponseDto> {
        try {
            const uploadConfig = this.configService.get('upload');

            // Validate files
            FileValidator.validateFiles(files, uploadConfig.allowedMimeTypes, uploadConfig.maxFileSize);

            // Create upload record
            const upload = await this.prisma.upload.create({
                data: {
                    status: 'pending',
                    totalFiles: files.length,
                },
            });

            const uploadedFiles: FileResponseDto[] = [];
            const errors: string[] = [];

            // Upload files concurrently
            const uploadPromises = files.map(async (file, index) => {
                try {
                    const uploadResult = await this.spacesService.uploadFile(file, 'uploads/multiple');

                    const savedFile = await this.prisma.file.create({
                        data: {
                            filename: file.originalname,
                            mimetype: file.mimetype,
                            size: file.size,
                            url: uploadResult.url,
                            key: uploadResult.key,
                            bucket: uploadResult.bucket,
                            uploadType: 'multiple',
                            uploadId: upload.id,
                        },
                    });

                    return this.mapFileToDto(savedFile);
                } catch (error) {
                    const errorMessage = `File ${index + 1} (${file.originalname}): ${error.message}`;
                    errors.push(errorMessage);
                    this.logger.error(errorMessage, error.stack);
                    return null;
                }
            });

            const results = await Promise.allSettled(uploadPromises);

            // Collect successful uploads
            results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value) {
                    uploadedFiles.push(result.value);
                }
            });

            // Update upload status
            const finalStatus = uploadedFiles.length === files.length ? 'completed' :
                uploadedFiles.length > 0 ? 'completed' : 'failed';

            await this.prisma.upload.update({
                where: { id: upload.id },
                data: { status: finalStatus },
            });

            this.logger.log(`Multiple files upload completed: ${uploadedFiles.length}/${files.length} successful`);

            return {
                files: uploadedFiles,
                uploadId: upload.id,
                message: `${uploadedFiles.length} of ${files.length} files uploaded successfully`,
                totalFiles: files.length,
            };
        } catch (error) {
            this.logger.error(`Multiple files upload failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get Upload by ID
     * @param id 
     * @returns 
     */
    async getUploadById(id: string): Promise<UploadResponseDto> {
        const upload = await this.prisma.upload.findUnique({
            where: { id },
            include: {
                files: true,
            },
        });

        if (!upload) {
            throw new NotFoundException(`Upload with ID ${id} not found`);
        }

        return {
            id: upload.id,
            files: upload.files.map(file => this.mapFileToDto(file)),
            status: upload.status as any,
            totalFiles: upload.totalFiles,
            createdAt: upload.createdAt.toISOString(),
            updatedAt: upload.updatedAt.toISOString(),
        };
    }

    /**
     * Get File by ID
     * @param id 
     * @returns 
     */
    async getFileById(id: string): Promise<FileResponseDto> {
        const file = await this.prisma.file.findUnique({
            where: { id },
        });

        if (!file) {
            throw new NotFoundException(`File with ID ${id} not found`);
        }

        return this.mapFileToDto(file);
    }

    /**
     * Delete File by ID
     * @param id 
     * @returns 
     */
    async deleteFile(id: string): Promise<{ success: boolean; message: string }> {
        try {
            const file = await this.prisma.file.findUnique({
                where: { id },
            });

            if (!file) {
                throw new NotFoundException(`File with ID ${id} not found`);
            }

            // Delete from DigitalOcean Spaces
            await this.spacesService.deleteFile(file.key);

            // Delete from database
            await this.prisma.file.delete({
                where: { id },
            });

            this.logger.log(`File deleted successfully: ${id}`);

            return {
                success: true,
                message: 'File deleted successfully',
            };
        } catch (error) {
            this.logger.error(`File deletion failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get All Files with Pagination
     * @param paginationOptions
     * @returns
     */
    async getAllFiles(paginationOptions: PaginationOptions): Promise<PaginatedResult<FileResponseDto>> {
        const paginationQuery = this.paginationService.createPaginationQuery(paginationOptions);

        const [files, total] = await Promise.all([
            this.prisma.file.findMany({
                skip: paginationQuery.skip,
                take: paginationQuery.take,
                orderBy: paginationQuery.orderBy || { createdAt: 'desc' },
                where: paginationQuery.where,
            }),
            this.prisma.file.count({
                where: paginationQuery.where,
            }),
        ]);

        const mappedFiles = files.map(file => this.mapFileToDto(file));

        return this.paginationService.createPaginatedResult(
            mappedFiles,
            total,
            paginationOptions
        );
    }

    /**
     * Get All Uploads with Pagination
     * @param paginationOptions
     * @returns
     */
    async getAllUploads(paginationOptions: PaginationOptions): Promise<PaginatedResult<UploadResponseDto>> {
        const paginationQuery = this.paginationService.createPaginationQuery(paginationOptions);

        const [uploads, total] = await Promise.all([
            this.prisma.upload.findMany({
                skip: paginationQuery.skip,
                take: paginationQuery.take,
                include: {
                    files: true,
                },
                orderBy: paginationQuery.orderBy || { createdAt: 'desc' },
                where: paginationQuery.where,
            }),
            this.prisma.upload.count({
                where: paginationQuery.where,
            }),
        ]);

        const mappedUploads = uploads.map(upload => ({
            id: upload.id,
            files: upload.files.map(file => this.mapFileToDto(file)),
            status: upload.status as any,
            totalFiles: upload.totalFiles,
            createdAt: upload.createdAt.toISOString(),
            updatedAt: upload.updatedAt.toISOString(),
        }));

        return this.paginationService.createPaginatedResult(
            mappedUploads,
            total,
            paginationOptions
        );
    }

    /**
     * Map File to DTO
     * @param file 
     * @returns 
     */
    private mapFileToDto(file: any): FileResponseDto {
        return {
            id: file.id,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            url: file.url,
            key: file.key,
            bucket: file.bucket,
            uploadType: file.uploadType,
            uploadId: file.uploadId,
            uploadedAt: file.uploadedAt.toISOString(),
            createdAt: file.createdAt.toISOString(),
            updatedAt: file.updatedAt.toISOString(),
        };
    }
}