# EviterStudio File Upload

A comprehensive file upload system built with NestJS, featuring DigitalOcean Spaces integration, modern UI, and robust error handling.

## 🚀 Features

- **Multiple Upload Methods**: Single file and multiple file uploads
- **Cloud Storage**: DigitalOcean Spaces integration with S3-compatible API
- **Modern UI**: Glassmorphism design with drag-and-drop functionality
- **Real-time Analytics**: Upload statistics and file management
- **Framework Integration**: Built with EviterStudio Framework for pagination and responses
- **Type Safety**: Full TypeScript implementation
- **Error Handling**: Comprehensive error handling and validation
- **File Management**: View, search, filter, and delete uploaded files

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Configuration](#-configuration)
- [Architecture](#-architecture)
- [Frontend Guide](#-frontend-guide)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- DigitalOcean Spaces account (or S3-compatible storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd practice_file_upload
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/fileupload"

   # DigitalOcean Spaces
   DO_SPACES_KEY="your_access_key"
   DO_SPACES_SECRET="your_secret_key"
   DO_SPACES_ENDPOINT="https://nyc3.digitaloceanspaces.com"
   DO_SPACES_BUCKET="your_bucket_name"
   DO_SPACES_REGION="nyc3"

   # Application
   PORT=3018
   ```

5. **Database setup**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Start the application**
   ```bash
   # Development
   npm run start:dev

   # Production
   npm run build
   npm run start:prod
   ```

7. **Access the application**
   - API: http://localhost:3018
   - Web UI: http://localhost:3018
   - Health Check: http://localhost:3018/upload/health

## 📚 API Documentation

### Upload Endpoints

#### Single File Upload
```http
POST /upload/single
Content-Type: multipart/form-data

Form Data:
- file: <binary file>
```

**Response:**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "File uploaded successfully",
  "data": {
    "file": {
      "id": "uuid",
      "filename": "original_name.jpg",
      "mimetype": "image/jpeg",
      "size": 1024576,
      "url": "https://bucket.region.digitaloceanspaces.com/path/file.jpg",
      "key": "path/file.jpg",
      "bucket": "your_bucket",
      "uploadType": "single",
      "uploadedAt": "2025-01-20T10:30:00.000Z"
    }
  }
}
```

#### Multiple Files Upload
```http
POST /upload/multiple
Content-Type: multipart/form-data

Form Data:
- files: <binary file 1>
- files: <binary file 2>
- files: <binary file N>
```

**Response:**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "Multiple files uploaded successfully",
  "data": {
    "upload": {
      "id": "uuid",
      "status": "completed",
      "totalFiles": 3,
      "createdAt": "2025-01-20T10:30:00.000Z"
    },
    "files": [
      {
        "id": "uuid",
        "filename": "file1.jpg",
        "url": "https://...",
        "size": 1024576
      }
    ]
  }
}
```

### File Management Endpoints

#### Get All Files (Paginated)
```http
GET /upload/files?page=1&limit=10&sortBy=createdAt&sortOrder=DESC&search=filename
```

#### Get File Details
```http
GET /upload/file/:id
```

#### Delete File
```http
DELETE /upload/file/:id
```

#### Get Upload Sessions
```http
GET /upload/uploads?page=1&limit=10
```

#### Get Upload Details
```http
GET /upload/upload/:id
```

#### Health Check
```http
GET /upload/health
```

### Response Format

All API responses follow the EviterStudio Framework format:

```json
{
  "status": "success" | "error",
  "statusCode": 200,
  "message": "Operation description",
  "data": {},
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/api/endpoint"
}
```

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | - |
| `DO_SPACES_KEY` | Yes | DigitalOcean Spaces access key | - |
| `DO_SPACES_SECRET` | Yes | DigitalOcean Spaces secret key | - |
| `DO_SPACES_ENDPOINT` | Yes | Spaces endpoint URL | - |
| `DO_SPACES_BUCKET` | Yes | Bucket name | - |
| `DO_SPACES_REGION` | Yes | Spaces region | - |
| `PORT` | No | Application port | 3018 |

### File Upload Limits

- **Maximum file size**: 10MB per file
- **Maximum files per upload**: 10 files
- **Supported formats**: Images, PDFs, Documents
- **Accepted MIME types**:
  - Images: `image/*`
  - Documents: `application/pdf`, `.doc`, `.docx`, `.txt`

### Prisma Configuration

The application uses Prisma ORM with PostgreSQL. Database schema includes:

- `File` model: Stores file metadata and storage information
- `Upload` model: Tracks upload sessions for multiple files

## 🏗️ Architecture

### Backend Structure

```
src/
├── config/              # Configuration files
│   ├── spaces.config.ts # DigitalOcean Spaces config
│   └── upload.config.ts # Upload settings
├── controllers/         # Request handlers
│   └── upload.controller.ts
├── services/            # Business logic
│   ├── spaces.service.ts    # Cloud storage operations
│   ├── upload.service.ts    # Upload business logic
│   └── prisma.service.ts    # Database service
├── dto/                 # Data transfer objects
├── modules/             # NestJS modules
│   └── upload.module.ts
├── validators/          # Custom validators
├── interceptors/        # Request/response interceptors
├── filters/             # Exception filters
└── main.ts             # Application entry point
```

### Frontend Structure

```
public/
├── index.html          # Main HTML file
├── css/
│   └── style.css      # Glassmorphism design
└── js/
    └── app.js         # File upload application
```

### Key Services

1. **SpacesService**: Handles DigitalOcean Spaces operations
2. **UploadService**: Manages upload business logic and database operations
3. **PrismaService**: Database connection and operations

### Framework Integration

- **EviterStudio Framework Core**: Pagination, response formatting, validation
- **EviterStudio Framework NestJS**: Decorators for pagination and API responses

## 🎨 Frontend Guide

### UI Features

- **Glassmorphism Design**: Modern, translucent interface
- **Drag & Drop**: Intuitive file selection
- **Real-time Updates**: Live upload progress and analytics
- **Responsive Design**: Works on desktop and mobile
- **File Management**: Search, filter, sort, and delete files

### JavaScript API

The frontend uses a modern ES6+ class-based architecture:

```javascript
class FileUploadApp {
  // Handles all file upload operations
  async uploadSingleFile()
  async uploadMultipleFiles()

  // File management
  async loadFiles()
  async deleteFile(id)

  // UI updates
  updateSingleUploadUI(file)
  updateMultipleUploadUI()
}
```

### Error Handling

- Comprehensive null safety checks
- User-friendly error messages
- Toast notifications for feedback
- Graceful degradation for missing elements

## 🚀 Deployment

### Development

```bash
npm run start:dev
```

### Production Build

```bash
npm run build
npm run start:prod
```

### Environment Setup

1. Set up PostgreSQL database
2. Configure DigitalOcean Spaces
3. Set environment variables
4. Run database migrations
5. Build and start application

### Health Monitoring

The application includes a health check endpoint:
- URL: `/upload/health`
- Returns: Service status and timestamp

## 🧪 Testing

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Check the [API Documentation](#-api-documentation)
- Review the [Architecture](#-architecture) section
- Open an issue for bugs or feature requests

## 🔗 Links

- [NestJS Documentation](https://docs.nestjs.com/)
- [DigitalOcean Spaces](https://www.digitalocean.com/products/spaces/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [EviterStudio Framework](https://github.com/eviterstudio)