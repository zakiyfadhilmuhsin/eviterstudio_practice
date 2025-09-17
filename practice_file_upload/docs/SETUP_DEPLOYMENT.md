# Setup & Deployment Guide

Comprehensive guide for setting up the development environment and deploying the EviterStudio File Upload application to production.

## 📋 Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Node.js** | 18.0.0+ | 20.0.0+ |
| **npm** | 8.0.0+ | 10.0.0+ |
| **RAM** | 2GB | 4GB+ |
| **Storage** | 1GB | 5GB+ |
| **OS** | Windows 10, macOS 10.15, Ubuntu 18.04+ | Latest versions |

### Required Services

1. **PostgreSQL Database**
   - Version 12+ recommended
   - Can be local installation or cloud service

2. **DigitalOcean Spaces Account**
   - S3-compatible storage service
   - Alternative: AWS S3, MinIO, or other S3-compatible services

## 🚀 Local Development Setup

### Step 1: Clone Repository

```bash
# Clone the repository
git clone <repository-url>
cd practice_file_upload

# Verify Node.js version
node --version  # Should be 18+
npm --version   # Should be 8+
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 3: Environment Configuration

#### Create Environment File
```bash
# Copy example environment file
cp .env.example .env
```

#### Configure Environment Variables
Edit `.env` file with your specific values:

```env
# Application Configuration
NODE_ENV=development
PORT=3018

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/fileupload?schema=public"

# DigitalOcean Spaces Configuration
DO_SPACES_KEY="your_spaces_access_key"
DO_SPACES_SECRET="your_spaces_secret_key"
DO_SPACES_ENDPOINT="https://nyc3.digitaloceanspaces.com"
DO_SPACES_BUCKET="your_bucket_name"
DO_SPACES_REGION="nyc3"

# Upload Configuration (Optional)
MAX_FILE_SIZE=10485760          # 10MB in bytes
MAX_FILES=10                    # Maximum files per upload
ALLOWED_MIME_TYPES="image/*,application/pdf,text/*,.doc,.docx"
```

### Step 4: Database Setup

#### Install PostgreSQL (if not already installed)

**Windows:**
```bash
# Using Chocolatey
choco install postgresql

# Or download from https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE fileupload;
CREATE USER fileupload_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE fileupload TO fileupload_user;
\q
```

#### Run Database Migrations
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Verify database schema
npx prisma studio  # Opens web interface at http://localhost:5555
```

### Step 5: DigitalOcean Spaces Setup

#### Create Spaces Account
1. Sign up at [DigitalOcean](https://www.digitalocean.com/)
2. Navigate to Spaces in the control panel
3. Create a new Space:
   - Choose a region (e.g., NYC3)
   - Set a unique name for your bucket
   - Choose File Listing permissions (Restricted recommended)

#### Generate API Keys
1. Go to API section in DigitalOcean control panel
2. Generate new Spaces access keys
3. Note down the Access Key and Secret Key
4. Update your `.env` file with these credentials

#### Configure CORS (Optional)
For direct browser uploads, configure CORS:
```json
{
  "corsRules": [
    {
      "allowedHeaders": ["*"],
      "allowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "allowedOrigins": ["http://localhost:3018"],
      "maxAgeSeconds": 3000
    }
  ]
}
```

### Step 6: Start Development Server

```bash
# Start in development mode with hot reload
npm run start:dev

# Alternative: Start in regular mode
npm run start

# Verify server is running
curl http://localhost:3018/upload/health
```

### Step 7: Verify Installation

1. **Check API Health**
   ```bash
   curl http://localhost:3018/upload/health
   ```

2. **Test Web Interface**
   - Open browser to `http://localhost:3018`
   - Check connection status indicator
   - Try uploading a test file

3. **Verify Database Connection**
   ```bash
   npx prisma studio
   ```

## 🧪 Testing Setup

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode for development
npm run test:watch

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Test Database Setup

Create a separate database for testing:

```bash
# Create test database
createdb fileupload_test

# Update test environment
export DATABASE_URL="postgresql://username:password@localhost:5432/fileupload_test"

# Run test migrations
npx prisma migrate deploy
```

## 🏗️ Production Deployment

### Build for Production

```bash
# Build the application
npm run build

# Verify build output
ls -la dist/
```

### Environment Configuration

#### Production Environment Variables
```env
# Application
NODE_ENV=production
PORT=3018

# Database (Use connection pooling)
DATABASE_URL="postgresql://user:password@prod-db-host:5432/fileupload?connection_limit=10&pool_timeout=20"

# DigitalOcean Spaces
DO_SPACES_KEY="production_access_key"
DO_SPACES_SECRET="production_secret_key"
DO_SPACES_ENDPOINT="https://nyc3.digitaloceanspaces.com"
DO_SPACES_BUCKET="production_bucket"
DO_SPACES_REGION="nyc3"

# Security
CORS_ORIGIN="https://yourdomain.com"
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900000  # 15 minutes
```

### Database Migration

```bash
# Deploy migrations to production
npx prisma migrate deploy

# Generate production client
npx prisma generate
```

### Deployment Options

#### Option 1: Traditional Server

```bash
# Install PM2 for process management
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'file-upload-api',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3018
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.outerr.log',
    time: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Option 2: Docker Deployment

**Create Dockerfile:**
```dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY dist ./dist/
COPY public ./public/

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

# Expose port
EXPOSE 3018

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3018/upload/health || exit 1

# Start application
CMD ["node", "dist/main.js"]
```

**Create Docker Compose:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3018:3018"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/fileupload
    env_file:
      - .env.production
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: fileupload
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

**Build and Deploy:**
```bash
# Build Docker image
docker build -t file-upload-app .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app
```

#### Option 3: Cloud Platform Deployment

**Heroku:**
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DO_SPACES_KEY=your_key
heroku config:set DO_SPACES_SECRET=your_secret
# ... other environment variables

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
```

**DigitalOcean App Platform:**
```yaml
# .do/app.yaml
name: file-upload-app
services:
- name: api
  source_dir: /
  github:
    repo: your-username/your-repo
    branch: main
  run_command: node dist/main.js
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    value: ${db.DATABASE_URL}
  - key: DO_SPACES_KEY
    value: ${DO_SPACES_KEY}
    type: SECRET
  - key: DO_SPACES_SECRET
    value: ${DO_SPACES_SECRET}
    type: SECRET

databases:
- name: db
  engine: PG
  version: "15"
  production: true
  size: basic-xs
```

## 🔧 Configuration Management

### Environment Variables Reference

| Variable | Required | Description | Default | Example |
|----------|----------|-------------|---------|---------|
| `NODE_ENV` | Yes | Application environment | development | production |
| `PORT` | No | Application port | 3018 | 8080 |
| `DATABASE_URL` | Yes | PostgreSQL connection string | - | postgresql://user:pass@host:5432/db |
| `DO_SPACES_KEY` | Yes | DigitalOcean Spaces access key | - | AKIAIOSFODNN7EXAMPLE |
| `DO_SPACES_SECRET` | Yes | DigitalOcean Spaces secret key | - | wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY |
| `DO_SPACES_ENDPOINT` | Yes | Spaces endpoint URL | - | https://nyc3.digitaloceanspaces.com |
| `DO_SPACES_BUCKET` | Yes | Bucket name | - | my-app-uploads |
| `DO_SPACES_REGION` | Yes | Spaces region | - | nyc3 |
| `MAX_FILE_SIZE` | No | Maximum file size in bytes | 10485760 | 52428800 |
| `MAX_FILES` | No | Maximum files per upload | 10 | 20 |
| `CORS_ORIGIN` | No | Allowed CORS origins | * | https://yourdomain.com |

### Configuration Validation

```typescript
// Add to your startup script
function validateConfiguration() {
  const required = [
    'DATABASE_URL',
    'DO_SPACES_KEY',
    'DO_SPACES_SECRET',
    'DO_SPACES_ENDPOINT',
    'DO_SPACES_BUCKET',
    'DO_SPACES_REGION'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    process.exit(1);
  }
}

validateConfiguration();
```

## 📊 Monitoring & Logging

### Application Monitoring

#### Health Checks
```bash
# Application health
curl -f http://localhost:3018/upload/health

# Database health
npx prisma db pull  # Should succeed if DB is accessible

# Storage health (test upload)
curl -X POST http://localhost:3018/upload/single \
  -F "file=@test.txt" \
  --fail
```

#### Logging Setup
```typescript
// Production logging configuration
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const logger = WinstonModule.createLogger({
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});
```

### Performance Monitoring

#### Metrics to Track
- Request latency
- Upload success/failure rates
- Database query performance
- Storage operation latency
- Memory and CPU usage

#### Monitoring Tools
- **Application**: New Relic, DataDog, AppDynamics
- **Infrastructure**: Prometheus + Grafana
- **Logs**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Uptime**: UptimeRobot, Pingdom

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Use HTTPS in production
- [ ] Set secure environment variables
- [ ] Enable CORS with specific origins
- [ ] Implement rate limiting
- [ ] Use connection pooling for database
- [ ] Set up proper file permissions
- [ ] Enable security headers
- [ ] Implement input validation
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Database backup strategy
- [ ] File storage backup plan

### SSL/TLS Configuration

#### Nginx SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    location / {
        proxy_pass http://localhost:3018;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Test database connection
npx prisma db pull

# Check database URL format
echo $DATABASE_URL

# Verify database exists
psql $DATABASE_URL -c "SELECT version();"
```

#### Storage Issues
```bash
# Test DigitalOcean Spaces connectivity
curl -I $DO_SPACES_ENDPOINT

# Verify credentials
aws s3 ls --endpoint-url=$DO_SPACES_ENDPOINT
```

#### Build Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript compilation
npx tsc --noEmit
```

#### Performance Issues
```bash
# Check memory usage
node --max-old-space-size=4096 dist/main.js

# Enable Node.js profiling
node --prof dist/main.js

# Analyze CPU usage
top -p $(pgrep -f "node.*main.js")
```

### Debugging Tools

```bash
# Enable debug logging
DEBUG=* npm run start:dev

# Database query logging
DATABASE_LOGGING=true npm run start:dev

# Prisma debug
DEBUG=prisma:* npm run start:dev
```

### Log Analysis

```bash
# View application logs
tail -f logs/combined.log

# Search for errors
grep -i error logs/combined.log

# Analyze access patterns
awk '{print $7}' access.log | sort | uniq -c | sort -nr
```

## 📈 Scaling Considerations

### Horizontal Scaling

#### Load Balancer Configuration
```nginx
upstream app_servers {
    server 127.0.0.1:3018;
    server 127.0.0.1:3019;
    server 127.0.0.1:3020;
}

server {
    location / {
        proxy_pass http://app_servers;
    }
}
```

#### Database Scaling
- Read replicas for query distribution
- Connection pooling with PgBouncer
- Database sharding strategies
- Query optimization and indexing

#### Storage Scaling
- CDN integration for global access
- Multiple region deployments
- Content compression and optimization
- Edge caching strategies

### Vertical Scaling

#### Resource Optimization
```bash
# Optimize Node.js memory
node --max-old-space-size=8192 dist/main.js

# Enable cluster mode
pm2 start ecosystem.config.js
```

## 📞 Support & Maintenance

### Backup Procedures

#### Database Backup
```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
```

#### File Storage Backup
```bash
# Sync files from DigitalOcean Spaces
aws s3 sync s3://your-bucket ./backups/files --endpoint-url=$DO_SPACES_ENDPOINT
```

### Update Procedures

```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit
npm audit fix

# Update framework versions
npm install @nestjs/core@latest @nestjs/common@latest

# Test after updates
npm run test
npm run build
```

### Maintenance Windows

Plan for regular maintenance:
- **Weekly**: Dependency updates and security patches
- **Monthly**: Database optimization and cleanup
- **Quarterly**: Major version updates and feature releases
- **Annually**: Architecture review and performance optimization

For additional support, refer to:
- [Main README](../README.md)
- [API Documentation](API.md)
- [Architecture Documentation](ARCHITECTURE.md)
- [User Guide](USER_GUIDE.md)