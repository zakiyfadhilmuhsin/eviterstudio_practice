import { registerAs } from '@nestjs/config';

export default registerAs('upload', () => ({
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') || 10485760, // 10MB
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
}));