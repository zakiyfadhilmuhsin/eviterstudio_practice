import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let details: any = null;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                message = (exceptionResponse as any).message || exception.message;
                details = (exceptionResponse as any).details || null;
            }
        } else {
            // Handle Prisma errors
            if (exception?.code) {
                switch (exception.code) {
                    case 'P2002':
                        status = HttpStatus.CONFLICT;
                        message = 'A record with this data already exists';
                        break;
                    case 'P2025':
                        status = HttpStatus.NOT_FOUND;
                        message = 'Record not found';
                        break;
                    default:
                        message = 'Database error occurred';
                }
            }

            // Handle Multer errors
            if (exception?.code === 'LIMIT_FILE_SIZE') {
                status = HttpStatus.BAD_REQUEST;
                message = 'File size exceeds limit';
            } else if (exception?.code === 'LIMIT_FILE_COUNT') {
                status = HttpStatus.BAD_REQUEST;
                message = 'Too many files';
            } else if (exception?.code === 'LIMIT_UNEXPECTED_FILE') {
                status = HttpStatus.BAD_REQUEST;
                message = 'Unexpected file field';
            }

            // Handle AWS SDK errors
            if (exception?.name === 'NoSuchBucket') {
                status = HttpStatus.SERVICE_UNAVAILABLE;
                message = 'Storage service unavailable';
            } else if (exception?.name === 'AccessDenied') {
                status = HttpStatus.FORBIDDEN;
                message = 'Storage access denied';
            }
        }

        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message,
            ...(details && { details }),
        };

        // Log error details
        this.logger.error(
            `${request.method} ${request.url} - ${status} - ${message}`,
            exception.stack,
        );

        response.status(status).json(errorResponse);
    }
}