# Technical Architecture

Comprehensive technical documentation for the EviterStudio File Upload system architecture, design patterns, and implementation details.

## 🏗️ System Overview

The EviterStudio File Upload system is a modern, cloud-native application built with a modular architecture that separates concerns between file storage, data persistence, and user interface.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   NestJS API    │    │ DigitalOcean    │
│                 │◄──►│                 │◄──►│    Spaces       │
│  HTML/CSS/JS    │    │   TypeScript    │    │  (S3 Compatible)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │    Database     │
                       │   (via Prisma)  │
                       └─────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | User interface and interactions |
| **Backend** | NestJS 11.x, TypeScript | API server and business logic |
| **Database** | PostgreSQL with Prisma ORM | Data persistence and relationships |
| **Storage** | DigitalOcean Spaces (S3-compatible) | File storage and CDN |
| **Framework** | EviterStudio Framework | Pagination, responses, validation |

## 🎯 Design Principles

### 1. Separation of Concerns

Each component has a single responsibility:
- **Controllers**: Handle HTTP requests and responses
- **Services**: Implement business logic
- **Modules**: Organize related functionality
- **DTOs**: Define data transfer objects
- **Validators**: Handle input validation

### 2. Dependency Injection

NestJS's built-in DI container manages dependencies:
```typescript
@Injectable()
export class UploadService {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly prismaService: PrismaService,
    private readonly paginationService: PaginationService,
  ) {}
}
```

### 3. Type Safety

Full TypeScript implementation ensures:
- Compile-time error detection
- Better IDE support and autocomplete
- Reduced runtime errors
- Clear interface contracts

### 4. Modular Architecture

Feature-based modules with clear boundaries:
```
src/
├── modules/
│   └── upload.module.ts      # Upload feature module
├── controllers/
│   └── upload.controller.ts  # HTTP request handling
├── services/
│   ├── upload.service.ts     # Business logic
│   ├── spaces.service.ts     # Cloud storage
│   └── prisma.service.ts     # Database operations
```

## 🔧 Backend Architecture

### NestJS Application Structure

```typescript
// Application Bootstrap
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  app.enableCors();

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT || 3018);
}
```

### Module Architecture

#### AppModule (Root Module)
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    UploadModule,
  ],
})
export class AppModule {}
```

#### UploadModule (Feature Module)
```typescript
@Module({
  imports: [
    ConfigModule.forFeature(spacesConfig),
    ConfigModule.forFeature(uploadConfig),
    MulterModule.register({
      // Memory storage for file buffers
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10,
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
  exports: [UploadService, SpacesService, PrismaService],
})
export class UploadModule {}
```

### Service Layer Architecture

#### SpacesService (Cloud Storage)
```typescript
@Injectable()
export class SpacesService {
  private readonly s3Client: S3Client;

  async uploadFile(file: Express.Multer.File, folder?: string): Promise<UploadResult> {
    // File validation
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('File buffer is empty');
    }

    // Generate unique filename
    const uniqueFilename = `${uuidv4()}${this.getFileExtension(file.originalname)}`;
    const key = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;

    // Upload to DigitalOcean Spaces
    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
      ContentLength: file.buffer.length,
    });

    await this.s3Client.send(uploadCommand);
    return {
      key,
      url: this.generatePublicUrl(key),
      bucket: this.bucket,
    };
  }
}
```

#### UploadService (Business Logic)
```typescript
@Injectable()
export class UploadService {
  async uploadSingleFile(file: Express.Multer.File): Promise<SingleUploadResponseDto> {
    // Upload to cloud storage
    const uploadResult = await this.spacesService.uploadFile(file, 'uploads');

    // Save metadata to database
    const savedFile = await this.prismaService.file.create({
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

    return { file: savedFile };
  }
}
```

### Controller Layer

#### RESTful API Design
```typescript
@Controller('upload')
export class UploadController {
  @Post('single')
  @ApiCreatedResponse('File uploaded successfully')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<SingleUploadResponseDto> {
    return this.uploadService.uploadSingleFile(file);
  }

  @Get('files')
  @Paginate()
  @ApiSuccessResponse('Files retrieved successfully')
  async getAllFiles(
    @PaginationParams() paginationOptions: PaginationOptions,
  ): Promise<PaginatedResult<FileResponseDto>> {
    return this.uploadService.getAllFiles(paginationOptions);
  }
}
```

### Data Layer Architecture

#### Prisma ORM Integration
```prisma
model File {
  id          String   @id @default(uuid())
  filename    String   // Original filename
  mimetype    String   // File MIME type
  size        Int      // File size in bytes
  url         String   // DigitalOcean Spaces URL
  key         String   // Object key in Spaces
  bucket      String   // Bucket name
  uploadType  String   // 'single' | 'multiple'
  uploadId    String?  // Reference to Upload for multiple files
  upload      Upload?  @relation(fields: [uploadId], references: [id])
  uploadedAt  DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("files")
}

model Upload {
  id          String   @id @default(uuid())
  files       File[]   // Related files
  status      String   // 'pending' | 'completed' | 'failed'
  totalFiles  Int      // Total files in upload
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("uploads")
}
```

#### Database Service
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

## 🎨 Frontend Architecture

### Modern Vanilla JavaScript Design

#### Class-Based Architecture
```javascript
class FileUploadApp {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3018';
    this.selectedFiles = [];
    this.isUploading = false;
    this.init();
  }

  async init() {
    this.bindEvents();
    this.setupDragAndDrop();
    await this.checkServerStatus();
    await this.loadFiles();
    this.startPeriodicRefresh();
  }
}
```

#### Component Separation
```javascript
// File Upload Components
async uploadSingleFile()    // Single file upload logic
async uploadMultipleFiles() // Multiple files upload logic

// UI Management Components
updateSingleUploadUI(file)   // Update single upload interface
updateMultipleUploadUI()     // Update multiple upload interface
resetSingleUpload()          // Reset single upload state
resetMultipleUpload()        // Reset multiple upload state

// Data Management Components
async loadFiles()            // Load and display files
async loadAnalytics()        // Load statistics
async deleteFile(id)         // Delete file operation

// Utility Components
validateFile(file)           // File validation
formatFileSize(bytes)        // Format file sizes
getFileIcon(mimetype)        // Get appropriate file icons
showToast(type, title, message) // User notifications
```

### Error Handling Strategy

#### Null Safety Pattern
```javascript
safeGetElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`Element with ID '${id}' not found`);
  }
  return element;
}

// Usage with null checks
const uploadBtn = this.safeGetElement('singleUploadBtn');
if (uploadBtn) {
  uploadBtn.disabled = false;
}
```

#### Graceful Degradation
- Progressive enhancement approach
- Fallback mechanisms for missing features
- User-friendly error messages
- Comprehensive logging for debugging

### UI/UX Architecture

#### Glassmorphism Design System
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
}
```

#### Responsive Grid System
```css
.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .files-grid {
    grid-template-columns: 1fr;
  }
}
```

## 🔗 Integration Architecture

### EviterStudio Framework Integration

#### Pagination System
```typescript
// Backend Integration
@Get('files')
@Paginate()
async getAllFiles(
  @PaginationParams() paginationOptions: PaginationOptions,
): Promise<PaginatedResult<FileResponseDto>> {
  return this.paginationService.createPaginationQuery({
    model: 'file',
    args: {
      where: this.buildWhereClause(paginationOptions),
      orderBy: this.buildOrderBy(paginationOptions),
    },
    paginationOptions,
  });
}
```

#### Response Standardization
```typescript
// Automatic response formatting
@ApiSuccessResponse('Operation successful')
@ApiCreatedResponse('Resource created successfully')
```

### Cloud Storage Integration

#### S3-Compatible API Usage
```typescript
// DigitalOcean Spaces configuration
const s3Client = new S3Client({
  endpoint: 'https://nyc3.digitaloceanspaces.com',
  region: 'nyc3',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
  forcePathStyle: false,
});
```

#### File Operations
```typescript
// Upload operation
const uploadCommand = new PutObjectCommand({
  Bucket: bucket,
  Key: key,
  Body: fileBuffer,
  ContentType: mimetype,
  ACL: 'public-read',
});

// Delete operation
const deleteCommand = new DeleteObjectCommand({
  Bucket: bucket,
  Key: key,
});
```

## 🔒 Security Architecture

### Input Validation

#### File Validation Pipeline
```typescript
validateFile(file: Express.Multer.File): boolean {
  // Size validation
  if (file.size > 10 * 1024 * 1024) {
    throw new BadRequestException('File too large');
  }

  // MIME type validation
  const allowedTypes = ['image/*', 'application/pdf', 'text/*'];
  if (!this.isValidMimeType(file.mimetype, allowedTypes)) {
    throw new BadRequestException('Unsupported file type');
  }

  return true;
}
```

#### Request Validation
```typescript
// DTOs with validation decorators
export class FileResponseDto {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  mimetype: string;

  @IsNumber()
  @Min(1)
  size: number;
}
```

### Error Handling

#### Global Exception Filter
```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    response.status(status).json({
      status: 'error',
      statusCode: status,
      message: exception.message || 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

## 📊 Performance Architecture

### Optimization Strategies

#### File Upload Optimization
- Memory-based file storage (no disk I/O)
- Streaming uploads to cloud storage
- Parallel processing for multiple files
- Progress tracking and user feedback

#### Database Optimization
- Indexed queries for file searches
- Pagination to limit result sets
- Connection pooling via Prisma
- Optimized query patterns

#### Frontend Optimization
- Lazy loading for file listings
- Debounced search inputs
- Efficient DOM manipulation
- Progressive image loading

### Caching Strategy

#### Application-Level Caching
```typescript
// File metadata caching
private readonly fileCache = new Map<string, FileMetadata>();

async getFileMetadata(id: string): Promise<FileMetadata> {
  if (this.fileCache.has(id)) {
    return this.fileCache.get(id);
  }

  const metadata = await this.loadFileMetadata(id);
  this.fileCache.set(id, metadata);
  return metadata;
}
```

#### HTTP Caching
- Static assets caching via headers
- CDN caching for uploaded files
- API response caching where appropriate

## 🚀 Deployment Architecture

### Development Environment
```yaml
# Docker Compose for development
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3018:3018"
    environment:
      - NODE_ENV=development
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: fileupload
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Production Considerations

#### Scaling Strategy
- Horizontal scaling with load balancers
- Database read replicas for performance
- CDN integration for static assets
- Container orchestration with Kubernetes

#### Monitoring and Logging
```typescript
// Structured logging
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log({
          method: request.method,
          url: request.url,
          duration,
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }
}
```

## 🔧 Configuration Management

### Environment-Based Configuration
```typescript
// Configuration schemas
export const spacesConfig = registerAs('spaces', () => ({
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  endpoint: process.env.DO_SPACES_ENDPOINT,
  bucket: process.env.DO_SPACES_BUCKET,
  region: process.env.DO_SPACES_REGION,
}));

export const uploadConfig = registerAs('upload', () => ({
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  maxFiles: parseInt(process.env.MAX_FILES) || 10,
  allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [
    'image/*', 'application/pdf', 'text/*'
  ],
}));
```

## 🧪 Testing Architecture

### Testing Strategy
```typescript
// Unit Testing
describe('UploadService', () => {
  let service: UploadService;
  let spacesService: SpacesService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: SpacesService,
          useValue: mockSpacesService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  it('should upload single file successfully', async () => {
    const mockFile = createMockFile();
    const result = await service.uploadSingleFile(mockFile);
    expect(result.file.filename).toBe(mockFile.originalname);
  });
});
```

### Integration Testing
```typescript
// E2E Testing
describe('Upload (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/upload/single (POST)', () => {
    return request(app.getHttpServer())
      .post('/upload/single')
      .attach('file', 'test/fixtures/sample.pdf')
      .expect(201)
      .expect((res) => {
        expect(res.body.data.file.filename).toBe('sample.pdf');
      });
  });
});
```

## 📈 Future Architecture Considerations

### Scalability Enhancements
- Microservices architecture for larger scale
- Event-driven architecture with message queues
- Database sharding strategies
- Multi-region deployment

### Feature Extensions
- Real-time upload progress with WebSockets
- File processing pipelines (thumbnails, compression)
- Advanced file management (folders, tags, metadata)
- User authentication and authorization
- File sharing and collaboration features

### Performance Improvements
- Edge computing for global file access
- Advanced caching strategies (Redis, Memcached)
- Database optimization and query performance
- Frontend performance monitoring and optimization