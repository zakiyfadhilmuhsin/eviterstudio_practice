# Google OAuth Setup Guide

## Overview
Complete setup guide for Google OAuth authentication with HTML interface.

## Prerequisites
1. NestJS backend running on port 3018
2. Environment variables configured
3. Google Cloud Console project setup

## Step 1: Google Cloud Console Setup

### 1.1 Create or Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note the Project ID

### 1.2 Enable Google+ API
1. Navigate to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click "Enable"

### 1.3 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure consent screen if prompted:
   - Application name: "Practice Auth Demo"
   - User support email: Your email
   - Developer contact: Your email
4. Set Application type: "Web application"
5. Add Authorized JavaScript origins:
   ```
   http://localhost:3018
   ```
6. Add Authorized redirect URIs:
   ```
   http://localhost:3018/auth/google/callback
   ```
7. Click "Create"
8. Copy Client ID and Client Secret

## Step 2: Backend Configuration

### 2.1 Environment Variables
Create or update `.env` file in `practice_basic_auth` directory:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3018/auth/google/callback

# Other required variables
DATABASE_URL="postgresql://username:password@localhost:5432/practice_basic_auth"
JWT_SECRET="your-super-secret-jwt-key-here-make-it-long-and-complex"

# Email Configuration (for development)
EMAIL_FROM_NAME="Practice Basic Auth"
EMAIL_FROM_ADDRESS="noreply@practice-basic-auth.com"
FRONTEND_URL="http://localhost:3018"

# SMTP Configuration (Ethereal for testing)
NODE_ENV=development
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ethereal-username
SMTP_PASS=your-ethereal-password
```

### 2.2 Update Google Login HTML
Edit `public/google-login.html` and replace:
```html
data-client_id="YOUR_GOOGLE_CLIENT_ID"
```
With your actual Google Client ID (for Google Identity Services button).

## Step 3: Database Setup

### 3.1 Install Dependencies
```bash
cd practice_basic_auth
npm install
```

### 3.2 Setup Database
```bash
# Initialize Prisma (if not done)
npx prisma generate

# Run database migrations
npx prisma db push
```

## Step 4: Start the Application

### 4.1 Start Backend
```bash
cd practice_basic_auth
npm run start:dev
```

### 4.2 Access the Application
1. Open browser to: `http://localhost:3018/google-login.html`
2. Click "Continue with Google"
3. Complete OAuth flow
4. Should redirect to dashboard

## Step 5: Testing the Flow

### 5.1 Complete Authentication Flow
1. **Login Page**: `http://localhost:3018/google-login.html`
   - Click "Continue with Google"
   - Sign in with Google account
   - Should redirect back with token

2. **Dashboard**: `http://localhost:3018/dashboard.html`
   - View profile information
   - Check active sessions
   - Test logout functionality

3. **Security Features**:
   - CSRF protection via state parameter
   - XSS prevention with Content Security Policy
   - Secure token storage in sessionStorage
   - Auto token expiration (15 minutes)

### 5.2 Test Scenarios
- [ ] Fresh login flow
- [ ] Already authenticated redirect
- [ ] Token expiration handling
- [ ] Logout functionality
- [ ] Session management
- [ ] Security status display

## Security Features Implemented

### Frontend Security
- **Content Security Policy (CSP)**: Prevents XSS attacks
- **CSRF Protection**: State parameter validation
- **Secure Token Storage**: sessionStorage with expiration
- **Input Sanitization**: HTML sanitization utilities
- **Redirect Validation**: URL origin checking

### Backend Security
- **Rate Limiting**: Built-in throttling
- **Account Lockout**: Failed login protection
- **JWT Security**: Secure token generation
- **CORS Configuration**: Cross-origin protection
- **Input Validation**: Request validation pipes

## Troubleshooting

### Common Issues

1. **"invalid_client" Error**
   - Check GOOGLE_CLIENT_ID in .env
   - Verify authorized origins in Google Console

2. **"redirect_uri_mismatch" Error**
   - Check GOOGLE_CALLBACK_URL in .env
   - Verify redirect URIs in Google Console

3. **"Access blocked" Error**
   - Complete OAuth consent screen configuration
   - Add test users if app is in testing mode

4. **Database Connection Error**
   - Check DATABASE_URL in .env
   - Ensure PostgreSQL is running
   - Run `npx prisma db push`

5. **CORS Errors**
   - Check if backend is running on port 3018
   - Verify CORS configuration in main.ts

### Debug Tips

1. **Check Browser Console**: For JavaScript errors
2. **Check Network Tab**: For API request/response details
3. **Check Backend Logs**: For server-side errors
4. **Verify Environment Variables**: Ensure all required vars are set

## File Structure

```
practice_basic_auth/
├── public/
│   ├── google-login.html      # Login page
│   ├── dashboard.html         # Dashboard page
│   └── auth-utils.js         # Security utilities
├── src/
│   ├── authentication/
│   │   ├── controllers/
│   │   │   └── authentication.controller.ts
│   │   └── strategies/
│   │       └── google.strategy.ts
│   └── main.ts               # Static file serving
├── .env                      # Environment variables
└── GOOGLE_AUTH_SETUP.md     # This file
```

## Next Steps

After successful setup:
1. Test all authentication flows
2. Configure production environment variables
3. Set up proper domain and SSL certificates
4. Review and enhance security measures
5. Add monitoring and logging
6. Implement 2FA (if needed)

## Support

For issues:
1. Check Google Cloud Console configuration
2. Verify environment variables
3. Review browser console errors
4. Check backend logs
5. Refer to NestJS and Passport documentation