import { BadRequestException } from '@nestjs/common';

export class FileValidator {
    /**
     * == Table of Contents ==
     * 
     * 1. validateFile
     * 2. validateFiles
     * 3. sanitizeFilename
     * 4. getFileCategory
     * 
     * =======================
     */

    /**
     * Validate File
     * @param file 
     * @param allowedMimeTypes 
     * @param maxFileSize 
     */
    static validateFile(file: Express.Multer.File, allowedMimeTypes: string[], maxFileSize: number): void {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        // Check file size
        if (file.size > maxFileSize) {
            throw new BadRequestException(
                `File size exceeds limit. Maximum allowed: ${Math.round(maxFileSize / 1024 / 1024)}MB`
            );
        }

        // Check MIME type
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`
            );
        }

        // Check filename
        if (!file.originalname || file.originalname.trim() === '') {
            throw new BadRequestException('Invalid filename');
        }
    }

    /**
     * Validate Files
     * @param files 
     * @param allowedMimeTypes 
     * @param maxFileSize 
     * @param maxFiles 
     */
    static validateFiles(files: Express.Multer.File[], allowedMimeTypes: string[], maxFileSize: number, maxFiles: number = 10): void {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }

        if (files.length > maxFiles) {
            throw new BadRequestException(`Too many files. Maximum allowed: ${maxFiles}`);
        }

        // Validate each file
        files.forEach((file, index) => {
            try {
                this.validateFile(file, allowedMimeTypes, maxFileSize);
            } catch (error) {
                throw new BadRequestException(`File ${index + 1}: ${error.message}`);
            }
        });

        // Check total size
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const maxTotalSize = maxFileSize * files.length;

        if (totalSize > maxTotalSize) {
            throw new BadRequestException(
                `Total files size exceeds limit. Maximum allowed: ${Math.round(maxTotalSize / 1024 / 1024)}MB`
            );
        }
    }

    /**
     * Sanitize Filename
     * @param filename 
     * @returns 
     */
    static sanitizeFilename(filename: string): string {
        // Remove or replace invalid characters
        return filename
            .replace(/[^\w\s.-]/g, '') // Remove special characters except dots, dashes, and spaces
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .trim();
    }

    /**
     * Get File Category
     * @param mimetype 
     * @returns 
     */
    static getFileCategory(mimetype: string): string {
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        if (mimetype === 'application/pdf') return 'document';
        if (mimetype.includes('word') || mimetype.includes('document')) return 'document';
        if (mimetype.includes('sheet') || mimetype.includes('excel')) return 'spreadsheet';
        if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'presentation';
        return 'other';
    }
}