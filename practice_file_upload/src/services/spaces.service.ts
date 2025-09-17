import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as mimeTypes from 'mime-types';

export interface UploadResult {
    key: string;
    url: string;
    bucket: string;
}

@Injectable()
export class SpacesService {
    private readonly logger = new Logger(SpacesService.name);
    private readonly s3Client: S3Client;
    private readonly bucket: string;
    private readonly endpoint: string;

    /**
     * == Table of Contents ==
     * 
     * 1. Constructor
     * 2. Upload Single File
     * 3. Delete File
     * 4. Get File Info
     * 5. Get File Extension
     * 6. Generate Public URL
     * 7. Is Valid MIME Type
     * 8. Is Valid File Size
     * 
     * =======================
     */
    constructor(private readonly configService: ConfigService) {
        const spacesConfig = this.configService.get('spaces');
        this.bucket = spacesConfig.bucket;
        this.endpoint = spacesConfig.endpoint;

        this.s3Client = new S3Client({
            endpoint: spacesConfig.endpoint,
            region: spacesConfig.region,
            credentials: {
                accessKeyId: spacesConfig.accessKeyId,
                secretAccessKey: spacesConfig.secretAccessKey,
            },
            forcePathStyle: false,
        });
    }

    /**
     * Upload Single File
     * @param file 
     * @param folder 
     * @returns 
     */
    async uploadFile(file: Express.Multer.File, folder?: string): Promise<UploadResult> {
        try {
            // Validate file buffer exists
            if (!file.buffer || file.buffer.length === 0) {
                throw new Error(`File buffer is empty or missing. File size: ${file.size}, Buffer length: ${file.buffer?.length || 0}`);
            }

            this.logger.log(`Uploading file: ${file.originalname}, Size: ${file.size} bytes, Buffer length: ${file.buffer.length} bytes, MIME: ${file.mimetype}`);

            // Generate unique filename
            const fileExtension = this.getFileExtension(file.originalname);
            const uniqueFilename = `${uuidv4()}${fileExtension}`;
            const key = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;

            // Upload to DigitalOcean Spaces
            const uploadCommand = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read', // Make file publicly accessible
                ContentDisposition: `inline; filename="${file.originalname}"`,
                ContentLength: file.buffer.length, // Explicitly set content length
            });

            await this.s3Client.send(uploadCommand);

            // Generate public URL
            const url = this.generatePublicUrl(key);

            this.logger.log(`File uploaded successfully: ${key}`);

            return {
                key,
                url,
                bucket: this.bucket,
            };
        } catch (error) {
            this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
            throw new Error(`Upload failed: ${error.message}`);
        }
    }

    /**
     * Delete File
     * @param key 
     */
    async deleteFile(key: string): Promise<void> {
        try {
            const deleteCommand = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            await this.s3Client.send(deleteCommand);
            this.logger.log(`File deleted successfully: ${key}`);
        } catch (error) {
            this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
            throw new Error(`Delete failed: ${error.message}`);
        }
    }

    /**
     * Get File Info
     * @param key 
     * @returns 
     */
    async getFileInfo(key: string) {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            const response = await this.s3Client.send(command);
            return {
                contentType: response.ContentType,
                contentLength: response.ContentLength,
                lastModified: response.LastModified,
                metadata: response.Metadata,
            };
        } catch (error) {
            this.logger.error(`Failed to get file info: ${error.message}`, error.stack);
            throw new Error(`Get file info failed: ${error.message}`);
        }
    }

    /**
     * Get File Extension
     * @param filename 
     * @returns 
     */
    private getFileExtension(filename: string): string {
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
    }

    /**
     * Generate Public URL
     * @param key 
     * @returns 
     */
    private generatePublicUrl(key: string): string {
        // Format: https://bucket-name.region.digitaloceanspaces.com/file-key
        const region = this.configService.get('spaces.region');
        return `https://${this.bucket}.${region}.digitaloceanspaces.com/${key}`;
    }

    /**
     * Is Valid MIME Type
     * @param mimetype 
     * @param allowedTypes 
     * @returns 
     */
    isValidMimeType(mimetype: string, allowedTypes: string[]): boolean {
        return allowedTypes.includes(mimetype);
    }

    /**
     * Is Valid File Size
     * @param size 
     * @param maxSize 
     * @returns 
     */
    isValidFileSize(size: number, maxSize: number): boolean {
        return size <= maxSize;
    }
}