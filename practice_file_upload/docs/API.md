# API Documentation

Comprehensive API documentation for the EviterStudio File Upload service.

## Base URL

```
http://localhost:3018
```

## Authentication

Currently, no authentication is required. For production use, implement proper authentication and authorization.

## Response Format

All API responses follow the EviterStudio Framework standardized format:

```json
{
  "status": "success" | "error",
  "statusCode": 200,
  "message": "Human-readable message",
  "data": {},
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/api/endpoint"
}
```

## Error Handling

### Error Response Format

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Error description",
  "error": "Detailed error information",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/api/endpoint"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 404 | Not Found |
| 413 | Payload Too Large |
| 500 | Internal Server Error |

## Upload Endpoints

### 1. Single File Upload

Upload a single file to DigitalOcean Spaces.

**Endpoint:**
```http
POST /upload/single
```

**Content-Type:**
```
multipart/form-data
```

**Request Body:**
- `file` (required): Binary file data

**File Constraints:**
- Maximum size: 10MB
- Supported formats: Images, PDFs, Documents
- Accepted types: `image/*`, `application/pdf`, `.doc`, `.docx`, `.txt`

**Success Response (201):**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "File uploaded successfully",
  "data": {
    "file": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "filename": "document.pdf",
      "mimetype": "application/pdf",
      "size": 1048576,
      "url": "https://bucket.nyc3.digitaloceanspaces.com/uploads/uuid.pdf",
      "key": "uploads/uuid.pdf",
      "bucket": "your-bucket",
      "uploadType": "single",
      "uploadId": null,
      "uploadedAt": "2025-01-20T10:30:00.000Z",
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z"
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/upload/single"
}
```

**Error Response (400):**
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "No file provided",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/upload/single"
}
```

**cURL Example:**
```bash
curl -X POST \
  http://localhost:3018/upload/single \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@/path/to/your/file.pdf'
```

### 2. Multiple Files Upload

Upload multiple files in a single request.

**Endpoint:**
```http
POST /upload/multiple
```

**Content-Type:**
```
multipart/form-data
```

**Request Body:**
- `files` (required): Array of binary file data (max 10 files)

**File Constraints:**
- Maximum files: 10 per request
- Maximum size per file: 10MB
- Total maximum size: 100MB
- Supported formats: Same as single upload

**Success Response (201):**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "Multiple files uploaded successfully",
  "data": {
    "upload": {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "status": "completed",
      "totalFiles": 3,
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z"
    },
    "files": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174002",
        "filename": "image1.jpg",
        "mimetype": "image/jpeg",
        "size": 512000,
        "url": "https://bucket.nyc3.digitaloceanspaces.com/uploads/uuid1.jpg",
        "key": "uploads/uuid1.jpg",
        "bucket": "your-bucket",
        "uploadType": "multiple",
        "uploadId": "123e4567-e89b-12d3-a456-426614174001",
        "uploadedAt": "2025-01-20T10:30:00.000Z"
      },
      {
        "id": "123e4567-e89b-12d3-a456-426614174003",
        "filename": "document.pdf",
        "mimetype": "application/pdf",
        "size": 1024000,
        "url": "https://bucket.nyc3.digitaloceanspaces.com/uploads/uuid2.pdf",
        "key": "uploads/uuid2.pdf",
        "bucket": "your-bucket",
        "uploadType": "multiple",
        "uploadId": "123e4567-e89b-12d3-a456-426614174001",
        "uploadedAt": "2025-01-20T10:30:00.000Z"
      }
    ]
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/upload/multiple"
}
```

**cURL Example:**
```bash
curl -X POST \
  http://localhost:3018/upload/multiple \
  -H 'Content-Type: multipart/form-data' \
  -F 'files=@/path/to/file1.jpg' \
  -F 'files=@/path/to/file2.pdf' \
  -F 'files=@/path/to/file3.txt'
```

## File Management Endpoints

### 3. Get All Files (Paginated)

Retrieve a paginated list of all uploaded files with search and filtering capabilities.

**Endpoint:**
```http
GET /upload/files
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (starts from 1) |
| `limit` | integer | No | 10 | Number of files per page (max 100) |
| `sortBy` | string | No | createdAt | Field to sort by (`createdAt`, `filename`, `size`) |
| `sortOrder` | string | No | DESC | Sort order (`ASC`, `DESC`) |
| `search` | string | No | - | Search in filename |

**Success Response (200):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Files retrieved successfully",
  "data": {
    "items": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "filename": "document.pdf",
        "mimetype": "application/pdf",
        "size": 1048576,
        "url": "https://bucket.nyc3.digitaloceanspaces.com/uploads/uuid.pdf",
        "uploadType": "single",
        "uploadedAt": "2025-01-20T10:30:00.000Z",
        "createdAt": "2025-01-20T10:30:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "totalItems": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/upload/files"
}
```

**Example Requests:**
```bash
# Get first page with default settings
GET /upload/files

# Get specific page with custom limit
GET /upload/files?page=2&limit=20

# Search for files containing "report"
GET /upload/files?search=report

# Sort by file size (largest first)
GET /upload/files?sortBy=size&sortOrder=DESC
```

### 4. Get File Details

Retrieve detailed information about a specific file.

**Endpoint:**
```http
GET /upload/file/:id
```

**Path Parameters:**
- `id` (required): File UUID

**Success Response (200):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "File retrieved successfully",
  "data": {
    "file": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "filename": "document.pdf",
      "mimetype": "application/pdf",
      "size": 1048576,
      "url": "https://bucket.nyc3.digitaloceanspaces.com/uploads/uuid.pdf",
      "key": "uploads/uuid.pdf",
      "bucket": "your-bucket",
      "uploadType": "single",
      "uploadId": null,
      "uploadedAt": "2025-01-20T10:30:00.000Z",
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z",
      "upload": null
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/upload/file/123e4567-e89b-12d3-a456-426614174000"
}
```

**Error Response (404):**
```json
{
  "status": "error",
  "statusCode": 404,
  "message": "File not found",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/upload/file/invalid-uuid"
}
```

### 5. Delete File

Delete a file from both the database and DigitalOcean Spaces.

**Endpoint:**
```http
DELETE /upload/file/:id
```

**Path Parameters:**
- `id` (required): File UUID

**Success Response (200):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "File deleted successfully",
  "data": {
    "deleted": true,
    "fileId": "123e4567-e89b-12d3-a456-426614174000"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/upload/file/123e4567-e89b-12d3-a456-426614174000"
}
```

**Error Response (404):**
```json
{
  "status": "error",
  "statusCode": 404,
  "message": "File not found",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/upload/file/invalid-uuid"
}
```

## Upload Session Management

### 6. Get Upload Sessions

Retrieve paginated list of upload sessions (for multiple file uploads).

**Endpoint:**
```http
GET /upload/uploads
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 10 | Number of uploads per page |
| `sortBy` | string | No | createdAt | Sort field |
| `sortOrder` | string | No | DESC | Sort order |

**Success Response (200):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Uploads retrieved successfully",
  "data": {
    "items": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174001",
        "status": "completed",
        "totalFiles": 3,
        "createdAt": "2025-01-20T10:30:00.000Z",
        "updatedAt": "2025-01-20T10:30:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "totalItems": 5,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/upload/uploads"
}
```

### 7. Get Upload Session Details

Retrieve detailed information about a specific upload session including all associated files.

**Endpoint:**
```http
GET /upload/upload/:id
```

**Path Parameters:**
- `id` (required): Upload session UUID

**Success Response (200):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Upload retrieved successfully",
  "data": {
    "upload": {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "status": "completed",
      "totalFiles": 2,
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z",
      "files": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174002",
          "filename": "image1.jpg",
          "mimetype": "image/jpeg",
          "size": 512000,
          "url": "https://bucket.nyc3.digitaloceanspaces.com/uploads/uuid1.jpg",
          "uploadedAt": "2025-01-20T10:30:00.000Z"
        },
        {
          "id": "123e4567-e89b-12d3-a456-426614174003",
          "filename": "document.pdf",
          "mimetype": "application/pdf",
          "size": 1024000,
          "url": "https://bucket.nyc3.digitaloceanspaces.com/uploads/uuid2.pdf",
          "uploadedAt": "2025-01-20T10:30:00.000Z"
        }
      ]
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/upload/upload/123e4567-e89b-12d3-a456-426614174001"
}
```

## System Endpoints

### 8. Health Check

Check the service health and availability.

**Endpoint:**
```http
GET /upload/health
```

**Success Response (200):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Operation successful",
  "data": {
    "status": "Upload service is running",
    "timestamp": "2025-01-20T10:30:00.000Z"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/upload/health"
}
```

## Rate Limiting

Currently no rate limiting is implemented. For production use, consider implementing:

- Request rate limiting per IP
- File upload frequency limits
- Storage quota enforcement

## Webhooks

No webhook functionality is currently available. Future versions may include:

- Upload completion notifications
- File processing status updates
- Storage quota alerts

## SDK Examples

### JavaScript/Node.js

```javascript
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

// Single file upload
async function uploadSingleFile(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const response = await fetch('http://localhost:3018/upload/single', {
    method: 'POST',
    body: form
  });

  return response.json();
}

// Multiple files upload
async function uploadMultipleFiles(filePaths) {
  const form = new FormData();
  filePaths.forEach(path => {
    form.append('files', fs.createReadStream(path));
  });

  const response = await fetch('http://localhost:3018/upload/multiple', {
    method: 'POST',
    body: form
  });

  return response.json();
}

// Get files with pagination
async function getFiles(page = 1, limit = 10) {
  const response = await fetch(
    `http://localhost:3018/upload/files?page=${page}&limit=${limit}`
  );

  return response.json();
}
```

### Python

```python
import requests

# Single file upload
def upload_single_file(file_path):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(
            'http://localhost:3018/upload/single',
            files=files
        )
    return response.json()

# Multiple files upload
def upload_multiple_files(file_paths):
    files = []
    for path in file_paths:
        files.append(('files', open(path, 'rb')))

    response = requests.post(
        'http://localhost:3018/upload/multiple',
        files=files
    )

    # Close file handles
    for _, file_handle in files:
        file_handle.close()

    return response.json()

# Get files with pagination
def get_files(page=1, limit=10):
    response = requests.get(
        f'http://localhost:3018/upload/files?page={page}&limit={limit}'
    )
    return response.json()
```

## Testing

### Unit Testing

Run the test suite:
```bash
npm run test
```

### Integration Testing

Test the API endpoints:
```bash
npm run test:e2e
```

### Manual Testing

Use the provided web interface at `http://localhost:3018` for manual testing of all upload and file management features.

## Support

For API support and questions:

1. Check this documentation
2. Review the [main README](../README.md)
3. Open an issue in the repository
4. Check the application logs for detailed error information