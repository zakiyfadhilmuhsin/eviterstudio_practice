import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { PaginationService } from 'eviterstudio-framework-core';
import { UploadController } from '../controllers/upload.controller';
import { UploadService } from '../services/upload.service';
import { SpacesService } from '../services/spaces.service';
import { PrismaService } from '../services/prisma.service';
import spacesConfig from '../config/spaces.config';
import uploadConfig from '../config/upload.config';

@Module({
    imports: [
        ConfigModule.forFeature(spacesConfig),
        ConfigModule.forFeature(uploadConfig),
        MulterModule.register({
            // Don't use dest - keep files in memory buffer
            // dest: './temp-uploads',
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB default limit
                files: 10, // Maximum 10 files for multiple upload
            },
        }),
    ],
    controllers: [UploadController],
    providers: [
        UploadService,
        SpacesService,
        PrismaService,
        PaginationService,
    ],
    exports: [
        UploadService,
        SpacesService,
        PrismaService,
        PaginationService,
    ],
})
export class UploadModule { }