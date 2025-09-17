# EviterStudio Framework Integration - API Examples

## 🚀 **Updated API dengan EviterStudio Framework**

Sistem sekarang menggunakan EviterStudio Framework untuk pagination dan response formatting yang otomatis dan konsisten.

---

## 📋 **Response Format (Otomatis dengan Framework)**

### Standard Success Response
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Files retrieved successfully",
  "data": { /* actual data */ },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/upload/files"
}
```

### Paginated Response
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Files retrieved successfully",
  "data": [
    {
      "id": "uuid1",
      "filename": "document.pdf",
      "mimetype": "application/pdf",
      "size": 2048000,
      "url": "https://bucket.fra1.digitaloceanspaces.com/uploads/uuid1.pdf"
    }
  ],
  "meta": {
    "currentPage": 1,
    "itemsPerPage": 10,
    "totalItems": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔄 **Pagination (Dengan Framework Decorators)**

### Enhanced Pagination Query Parameters

```bash
# Basic pagination
GET /upload/files?page=1&limit=10

# Dengan sorting
GET /upload/files?page=1&limit=10&sortBy=createdAt&sortOrder=DESC

# Dengan search
GET /upload/files?page=1&limit=10&search=document&searchFields=filename

# Dengan filters
GET /upload/files?page=1&limit=10&filters[mimetype]=image/jpeg
```

### Response Structure
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Files retrieved successfully",
  "data": [
    /* array of files */
  ],
  "meta": {
    "currentPage": 1,
    "itemsPerPage": 10,
    "totalItems": 100,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## 📝 **API Endpoints dengan Framework Decorators**

### 1. Single File Upload
```http
POST /upload/single
Content-Type: multipart/form-data

Body: file (binary)
```

**Framework Features:**
- `@ApiCreatedResponse('File uploaded successfully')` → Otomatis format response 201
- Response wrapper otomatis dengan status, statusCode, message, timestamp

### 2. Multiple Files Upload
```http
POST /upload/multiple
Content-Type: multipart/form-data

Body: files[] (multiple files)
```

**Framework Features:**
- `@ApiCreatedResponse('Multiple files uploaded successfully')` → Format response 201
- Konsisten response structure

### 3. Get All Files (dengan Pagination Framework)
```http
GET /upload/files?page=1&limit=10&sortBy=createdAt&sortOrder=DESC
```

**Framework Features:**
- `@Paginate()` → Otomatis enable pagination interceptor
- `@PaginationParams()` → Extract & validate pagination parameters
- `@ApiSuccessResponse('Files retrieved successfully')` → Format response 200
- Automatic sorting, searching, filtering support

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `sortBy` (string): Field to sort by (e.g., 'createdAt', 'filename')
- `sortOrder` ('ASC' | 'DESC'): Sort direction (default: 'ASC')
- `search` (string): Search term
- `searchFields` (string[]): Fields to search in
- `filters[field]` (any): Filter by field value

### 4. Get All Uploads (dengan Pagination Framework)
```http
GET /upload/uploads?page=1&limit=5&sortBy=createdAt&sortOrder=DESC
```

**Framework Features:** Same as files endpoint

---

## 🎯 **Framework Benefits**

### 1. **Automatic Response Formatting**
- Konsisten response structure di semua endpoints
- Otomatis tambah timestamp, path, statusCode
- Error handling yang standardized

### 2. **Advanced Pagination**
- Built-in sorting support
- Search across multiple fields
- Dynamic filtering
- Otomatis pagination metadata

### 3. **Developer Experience**
- Simple decorators: `@Paginate()`, `@PaginationParams()`
- Type-safe dengan TypeScript
- Minimal boilerplate code

### 4. **Performance**
- Optimized pagination queries
- Automatic query building
- Memory efficient untuk large datasets

---

## 🧪 **Testing Examples**

### Get Files dengan Advanced Pagination
```bash
# Sort by file size descending
curl "http://localhost:3000/upload/files?sortBy=size&sortOrder=DESC&limit=5"

# Search for PDF files
curl "http://localhost:3000/upload/files?search=.pdf&searchFields=filename"

# Filter by image files only
curl "http://localhost:3000/upload/files?filters[mimetype]=image/jpeg"

# Combined: Search + Filter + Sort
curl "http://localhost:3000/upload/files?search=photo&filters[mimetype]=image/jpeg&sortBy=createdAt&sortOrder=DESC"
```

### Upload dan Get dengan Framework
```bash
# Upload single file
curl -X POST http://localhost:3000/upload/single \
  -F "file=@document.pdf"

# Get paginated files
curl "http://localhost:3000/upload/files?page=1&limit=5"

# Upload multiple files
curl -X POST http://localhost:3000/upload/multiple \
  -F "files=@file1.jpg" \
  -F "files=@file2.pdf"
```

---

## 🔧 **Implementation Changes**

### Controller Changes
- Replaced manual pagination logic dengan `@Paginate()` decorator
- Added `@PaginationParams()` untuk extract pagination options
- Added response decorators: `@ApiSuccessResponse()`, `@ApiCreatedResponse()`

### Service Changes
- Integrated `PaginationService` dari framework
- Used `createPaginationQuery()` untuk build Prisma queries
- Used `createPaginatedResult()` untuk consistent response format

### Module Changes
- Added `PaginationService` ke providers
- Framework services auto-available via decorators

Framework integration selesai! 🎉 Semua endpoints sekarang menggunakan EviterStudio Framework untuk pagination dan response yang konsisten.