import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        const url = request.url;
        const now = Date.now();

        this.logger.log(`Incoming Request: ${method} ${url}`);

        return next.handle().pipe(
            tap((data) => {
                const response = context.switchToHttp().getResponse();
                const statusCode = response.statusCode;
                const responseTime = Date.now() - now;

                this.logger.log(
                    `Outgoing Response: ${method} ${url} ${statusCode} - ${responseTime}ms`
                );

                // Log file upload details
                if (url.includes('/upload/') && data) {
                    if (data.file) {
                        this.logger.log(`Single file uploaded: ${data.file.filename} (${data.file.size} bytes)`);
                    } else if (data.files) {
                        this.logger.log(`Multiple files uploaded: ${data.files.length} files, Total size: ${data.files.reduce((sum: number, file: any) => sum + file.size, 0)} bytes`);
                    }
                }
            }),
        );
    }
}