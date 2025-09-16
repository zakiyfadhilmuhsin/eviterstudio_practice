# 🛡️ Account Lockout & Rate Limiting Implementation

## Overview

Comprehensive security implementation for the practice_basic_auth application, featuring account lockout mechanisms, rate limiting, suspicious activity detection, and administrative security management.

## 🔧 Features Implemented

### 1. Account Lockout System
- **Failed Login Tracking**: Monitors and records all login attempts
- **Progressive Lockout**: Increasing lockout duration for repeat violations
- **Configurable Thresholds**: Customizable max attempts and lockout duration
- **Automatic Unlock**: Lockouts expire automatically based on configuration
- **Manual Unlock**: Admin interface for emergency account unlocking

### 2. Rate Limiting
- **Multi-Level Protection**: Different limits for different endpoint types
- **IP-Based Throttling**: Prevents abuse from single IP addresses
- **Progressive Penalties**: Escalating restrictions for persistent violations
- **Flexible Configuration**: Environment-based configuration management

### 3. Security Monitoring
- **Suspicious Activity Detection**: AI-powered pattern recognition
- **Brute Force Detection**: Automatic detection and response
- **IP Reputation Tracking**: Monitoring and blocking of malicious IPs
- **Security Metrics**: Comprehensive dashboard and reporting

### 4. Admin Security Management
- **Lockout Management**: View and manage locked accounts
- **Security Dashboard**: Real-time security metrics and alerts
- **IP Management**: Block/unblock suspicious IP addresses
- **Audit Logging**: Comprehensive security event logging

## 📁 File Structure

```
src/authentication/
├── services/
│   ├── account-lockout.service.ts    # Core lockout logic
│   ├── security.service.ts           # Rate limiting & monitoring
│   └── index.ts                      # Service exports
├── guards/
│   └── rate-limit.guard.ts          # Rate limiting guard
├── controllers/
│   ├── authentication.controller.ts  # Enhanced with rate limiting
│   └── security-admin.controller.ts  # Admin security management
├── config/
│   └── throttler.config.ts          # Rate limiting configuration
└── authentication.module.ts          # Updated module exports

prisma/
├── schema.prisma                     # Enhanced with security fields
└── migrations/
    └── 20250916180228_add_security_features/
        └── migration.sql             # Database migration

docs/
└── security-implementation.md       # This documentation
```

## 🗄️ Database Schema Changes

### User Model Extensions
```prisma
model User {
  // ... existing fields

  // Account lockout fields
  failedLoginAttempts    Int       @default(0)
  lockedAt              DateTime?
  lockoutExpiresAt      DateTime?

  // New relation
  loginAttempts         LoginAttempt[]
}
```

### New LoginAttempt Model
```prisma
model LoginAttempt {
  id               String   @id @default(cuid())
  userId           String?
  email            String?
  ipAddress        String
  userAgent        String?
  success          Boolean  @default(false)
  lockoutTriggered Boolean  @default(false)
  failureReason    String?
  createdAt        DateTime @default(now())

  user             User?    @relation(fields: [userId], references: [id])

  @@index([email, createdAt])
  @@index([ipAddress, createdAt])
  @@index([success, createdAt])
  @@map("login_attempts")
}
```

## ⚙️ Configuration

### Environment Variables
```env
# Account Lockout Settings
LOCKOUT_MAX_ATTEMPTS=5                # Maximum failed attempts before lockout
LOCKOUT_DURATION=900000               # Lockout duration (15 minutes)
LOCKOUT_ATTEMPT_WINDOW=300000         # Time window for attempts (5 minutes)
LOCKOUT_PROGRESSIVE=true              # Enable progressive lockout

# Rate Limiting Configuration
THROTTLE_TTL=60000                    # Global rate limit window (1 minute)
THROTTLE_LIMIT=100                    # Global request limit (100/minute)

# Endpoint-Specific Rate Limits
RATE_LIMIT_LOGIN_MAX=5                # Login attempts per minute
RATE_LIMIT_REGISTER_MAX=3             # Registration attempts per minute
RATE_LIMIT_PASSWORD_MAX=3             # Password reset attempts per 5 minutes
```

### Default Security Thresholds
- **Login Attempts**: 5 attempts per minute per IP
- **Registration**: 3 attempts per minute per IP
- **Password Reset**: 3 attempts per 5 minutes per IP
- **Account Lockout**: 5 failed attempts → 15-minute lockout
- **Progressive Lockout**: 2x duration for each subsequent lockout in 24h

## 🔐 Security Features

### Account Lockout Flow
1. **Failed Attempt**: Record in `LoginAttempt` table with failure reason
2. **Threshold Check**: Compare against `LOCKOUT_MAX_ATTEMPTS`
3. **Lockout Trigger**: Set `lockedAt` and `lockoutExpiresAt` fields
4. **Access Denial**: Block login attempts during lockout period
5. **Auto Unlock**: Clear lockout fields when period expires
6. **Success Reset**: Clear failed attempts on successful login

### Rate Limiting Layers
1. **Global Rate Limiting**: Application-wide request throttling
2. **Endpoint-Specific**: Targeted limits for sensitive endpoints
3. **IP-Based Tracking**: Per-IP address rate limiting
4. **Progressive Penalties**: Escalating restrictions for violations

### Security Monitoring
- **Brute Force Detection**: 10+ failed attempts in 10 minutes
- **Suspicious Activity**: High-frequency requests, unusual patterns
- **IP Reputation**: Track and score IP addresses
- **Automated Blocking**: Temporary blocks for detected threats

## 🛠️ API Endpoints

### Public Authentication (Enhanced)
```http
POST /auth/register          # Rate limited: 3/minute
POST /auth/login            # Rate limited: 5/minute
POST /auth/forgot-password  # Rate limited: 3/5minutes
POST /auth/reset-password   # Rate limited: 3/5minutes
```

### Admin Security Management
```http
GET    /admin/security/locked-accounts    # View locked accounts
POST   /admin/security/unlock-account     # Manually unlock account
GET    /admin/security/lockout-stats      # Lockout statistics
GET    /admin/security/metrics            # Security metrics
POST   /admin/security/block-ip           # Block IP address
GET    /admin/security/ip-status/:ip      # Check IP status
POST   /admin/security/analyze-ip         # Analyze IP activity
GET    /admin/security/dashboard          # Security dashboard
```

## 📊 Monitoring & Analytics

### Available Metrics
- Failed login attempts per timeframe
- Account lockouts triggered
- Rate limit violations
- Suspicious IP addresses
- Geographic login patterns
- User agent analysis

### Security Alerts
- **Critical**: >10 lockouts/hour from single IP
- **High**: Brute force attack detected
- **Medium**: Rate limit violations
- **Low**: Geographic anomalies

## 🚀 Usage Examples

### Check Account Lockout Status
```typescript
const lockoutStatus = await accountLockoutService.isAccountLocked('user@example.com');
if (lockoutStatus.isLocked) {
  console.log(`Account locked until: ${lockoutStatus.lockoutExpiresAt}`);
}
```

### Record Failed Login Attempt
```typescript
await accountLockoutService.recordFailedAttempt(
  'user@example.com',
  req.ip,
  req.get('User-Agent'),
  'INVALID_PASSWORD'
);
```

### Check Rate Limit
```typescript
const rateLimitCheck = await securityService.checkRateLimit(req.ip, 'login');
if (!rateLimitCheck.allowed) {
  throw new ForbiddenException('Rate limit exceeded');
}
```

### Analyze Suspicious Activity
```typescript
const analysis = await securityService.analyzeSuspiciousActivity(
  req.ip,
  req.get('User-Agent')
);
console.log(`Risk Score: ${analysis.riskScore}`);
```

## 🔧 Advanced Configuration

### Progressive Lockout Algorithm
```typescript
// Lockout duration increases exponentially for repeat offenders
const multiplier = Math.pow(2, previousLockouts);
const lockoutDuration = baseDuration * multiplier;
// Maximum 24 hours lockout
const finalDuration = Math.min(lockoutDuration, 24 * 60 * 60 * 1000);
```

### Suspicious Activity Scoring
```typescript
let riskScore = 0;
if (recentActivity.requestCount > 50) riskScore += 30;
if (recentActivity.failedLogins > 10) riskScore += 40;
if (isSuspiciousUserAgent(userAgent)) riskScore += 25;
// Risk threshold: 50+ = suspicious
```

## 🛡️ Security Best Practices

### Implemented Security Measures
- ✅ **Defense in Depth**: Multiple security layers
- ✅ **Fail Securely**: Secure defaults and error handling
- ✅ **Least Privilege**: Role-based access control
- ✅ **Audit Logging**: Comprehensive security event logging
- ✅ **Rate Limiting**: Multiple granularity levels
- ✅ **Input Validation**: All inputs validated
- ✅ **Error Handling**: No information disclosure

### Recommended Production Enhancements
- 🔄 **Redis Integration**: For distributed rate limiting
- 🔄 **GeoIP Detection**: Geographic anomaly detection
- 🔄 **Machine Learning**: Advanced pattern recognition
- 🔄 **SIEM Integration**: Security Information and Event Management
- 🔄 **Webhook Alerts**: Real-time security notifications
- 🔄 **Captcha Integration**: Human verification for suspicious activity

## 🧪 Testing

### Test Scenarios
1. **Account Lockout**: Verify lockout triggers after max attempts
2. **Auto Unlock**: Confirm automatic unlocking after duration
3. **Rate Limiting**: Test rate limit enforcement
4. **Brute Force**: Verify brute force detection
5. **Progressive Lockout**: Test escalating lockout durations
6. **Admin Functions**: Test manual unlock and monitoring

### Security Testing Commands
```bash
# Test account lockout
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}'
done
```

## 📈 Performance Considerations

### Optimizations Implemented
- **Database Indexes**: Optimized queries for security tables
- **In-Memory Caching**: Rate limit counters cached in memory
- **Async Operations**: Non-blocking security checks
- **Batch Operations**: Efficient database operations

### Scalability Notes
- Rate limiting cache can be moved to Redis for clustering
- Database indexes ensure fast security queries
- Background cleanup processes for expired data
- Configurable cache TTL for memory management

## 🔍 Troubleshooting

### Common Issues
1. **Account Stuck Locked**: Check `lockoutExpiresAt` in database
2. **Rate Limits Too Strict**: Adjust environment variables
3. **False Positives**: Review suspicious activity detection rules
4. **Performance Issues**: Monitor database query performance

### Debug Commands
```bash
# Check locked accounts
npx prisma studio

# View security logs
tail -f logs/security.log

# Test environment configuration
npm run test:security
```

## 📝 Migration Notes

### Database Migration
The migration `20250916180228_add_security_features` adds:
- New fields to `User` table
- New `LoginAttempt` table
- Optimized indexes for security queries

### Application Changes
- Enhanced `LocalStrategy` with security checks
- New security services and guards
- Updated authentication module
- New admin security controller

---

## 📞 Support

For questions or issues related to the security implementation:
1. Check the troubleshooting section above
2. Review the security logs for detailed error information
3. Consult the environment configuration documentation
4. Test with the provided security testing scenarios

**Security Implementation Complete!** 🎉