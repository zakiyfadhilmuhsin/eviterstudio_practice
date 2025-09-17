# DigitalOcean Spaces File Upload - Setup Guide

## 🚀 Feature Overview

Sistem upload file yang lengkap dengan dukungan:
- ✅ Single file upload ke DigitalOcean Spaces
- ✅ Multiple files upload dengan concurrent processing
- ✅ Prisma ORM untuk database management
- ✅ File validation (size, type, format)
- ✅ Error handling dan logging
- ✅ Pagination untuk listing files
- ✅ Delete files dari storage dan database

## 📋 Prerequisites

1. **DigitalOcean Spaces Account**
   - Buat Space di DigitalOcean
   - Generate Access Key dan Secret Key
   - Catat endpoint region (contoh: fra1, nyc3, sgp1)

2. **PostgreSQL Database**
   - Local PostgreSQL atau cloud database
   - Database connection string ready

## ⚙️ Setup Instructions

### 1. Environment Configuration

Buat file `.env` dari `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` dengan konfigurasi Anda:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/practice_file_upload"

# DigitalOcean Spaces
SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com
SPACES_ACCESS_KEY=your_access_key_here
SPACES_SECRET_KEY=your_secret_key_here
SPACES_BUCKET=your_bucket_name
SPACES_REGION=fra1

# Upload Settings
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_MIME_TYPES=image/jpeg,image/jpg,image/png,image/gif,application/pdf,text/plain

# Application
PORT=3000
NODE_ENV=development
```

### 2. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migration
npx prisma db push

# (Optional) Open Prisma Studio untuk melihat data
npx prisma studio
```

### 3. Build dan Run Application

```bash
# Build aplikasi
npm run build

# Start aplikasi
npm run start:dev
```

## 📡 API Endpoints

### Upload Endpoints

#### 1. Single File Upload
```http
POST /upload/single
Content-Type: multipart/form-data

Body: file (binary)
```

**Response:**
```json
{
  "file": {
    "id": "uuid",
    "filename": "original-name.jpg",
    "mimetype": "image/jpeg",
    "size": 1024000,
    "url": "https://bucket.fra1.digitaloceanspaces.com/uploads/uuid.jpg",
    "key": "uploads/uuid.jpg",
    "bucket": "your-bucket",
    "uploadType": "single",
    "uploadedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "File uploaded successfully"
}
```

#### 2. Multiple Files Upload
```http
POST /upload/multiple
Content-Type: multipart/form-data

Body: files[] (multiple binary files)
```

**Response:**
```json
{
  "files": [
    {
      "id": "uuid1",
      "filename": "file1.jpg",
      // ... file details
    },
    {
      "id": "uuid2",
      "filename": "file2.pdf",
      // ... file details
    }
  ],
  "uploadId": "upload-uuid",
  "message": "2 of 2 files uploaded successfully",
  "totalFiles": 2
}
```

### Management Endpoints

#### 3. Get All Files (with pagination)
```http
GET /upload/files?page=1&limit=10
```

#### 4. Get All Uploads (with pagination)
```http
GET /upload/uploads?page=1&limit=10
```

#### 5. Get Single File
```http
GET /upload/file/:id
```

#### 6. Get Upload Details
```http
GET /upload/upload/:id
```

#### 7. Delete File
```http
DELETE /upload/file/:id
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

#### 8. Health Check
```http
GET /upload/health
```

## 🧪 Testing dengan cURL

### Upload Single File
```bash
curl -X POST http://localhost:3000/upload/single \\
  -F "file=@/path/to/your/file.jpg"
```

### Upload Multiple Files
```bash
curl -X POST http://localhost:3000/upload/multiple \\
  -F "files=@/path/to/file1.jpg" \\
  -F "files=@/path/to/file2.pdf"
```

### Get All Files
```bash
curl http://localhost:3000/upload/files
```

### Delete File
```bash
curl -X DELETE http://localhost:3000/upload/file/your-file-id
```

## 🔧 Configuration Options

### File Upload Limits

Dalam `.env` file:
- `MAX_FILE_SIZE`: Maximum file size dalam bytes (default: 10MB)
- `ALLOWED_MIME_TYPES`: Comma-separated list of allowed MIME types

### DigitalOcean Spaces Regions

Available regions:
- `nyc1`, `nyc3` - New York
- `ams3` - Amsterdam
- `sgp1` - Singapore
- `fra1` - Frankfurt
- `sfo2`, `sfo3` - San Francisco
- `tor1` - Toronto
- `blr1` - Bangalore

## 🛡️ Security Features

1. **File Type Validation**: Hanya MIME types yang diizinkan
2. **File Size Limits**: Batas ukuran file konfigurabel
3. **Filename Sanitization**: Nama file dibersihkan otomatis
4. **Error Handling**: Comprehensive error handling dan logging
5. **CORS Protection**: CORS configuration untuk API security

## 📁 File Structure

```
src/
├── config/
│   ├── spaces.config.ts    # DigitalOcean Spaces config
│   └── upload.config.ts    # Upload settings config
├── controllers/
│   └── upload.controller.ts # API endpoints
├── dto/
│   ├── file.dto.ts         # File DTOs
│   └── upload.dto.ts       # Upload DTOs
├── filters/
│   └── http-exception.filter.ts # Global error handling
├── interceptors/
│   └── logging.interceptor.ts   # Request/response logging
├── modules/
│   └── upload.module.ts    # Upload module
├── services/
│   ├── prisma.service.ts   # Database service
│   ├── spaces.service.ts   # DigitalOcean Spaces service
│   └── upload.service.ts   # Upload business logic
└── validators/
    └── file.validator.ts   # File validation logic
```

## 🚨 Troubleshooting

### Common Issues

1. **Prisma Client Error**
   ```bash
   npx prisma generate
   ```

2. **Database Connection Error**
   - Check DATABASE_URL dalam .env
   - Ensure PostgreSQL is running

3. **DigitalOcean Spaces Error**
   - Verify SPACES_ACCESS_KEY dan SPACES_SECRET_KEY
   - Check bucket name dan region
   - Ensure bucket has public read access

4. **File Upload Fails**
   - Check file size limits
   - Verify MIME type is allowed
   - Check network connectivity

### Logs

Application logs tersedia di console saat development mode. Logs mencakup:
- Request/response details
- File upload progress
- Error details dan stack traces
- Performance metrics

## 🔄 Next Steps

1. Setup database migration untuk production
2. Configure CDN untuk better performance
3. Add authentication/authorization
4. Implement file compression
5. Add virus scanning integration
6. Setup monitoring dan alerts