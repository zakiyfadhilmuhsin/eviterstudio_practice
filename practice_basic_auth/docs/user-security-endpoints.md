# 🔐 User-Facing Security Endpoints

Dokumentasi endpoint security yang bisa diakses oleh user untuk monitoring dan self-service account security.

## 📋 Endpoint yang Ditambahkan ke Authentication Controller

### 1. **Security Status** - `GET /auth/security/status`
**Autentikasi**: Required (JWT)
**Rate Limit**: 10 requests/minute

Melihat status keamanan account saat ini.

**Response:**
```json
{
  "message": "Security status retrieved successfully",
  "data": {
    "account": {
      "isLocked": false,
      "attemptsRemaining": 5,
      "lockoutExpiresAt": null,
      "nextAttemptAllowedAt": null
    },
    "recentAttempts": [
      {
        "id": "...",
        "ipAddress": "192.168.1.xxx",
        "userAgent": {
          "browser": "Chrome",
          "os": "Windows",
          "device": "Desktop"
        },
        "success": true,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "security": {
      "lastSuccessfulLogin": "2024-01-15T10:30:00Z",
      "accountActive": true,
      "emailVerified": true
    }
  }
}
```

### 2. **Check Lockout Status** - `POST /auth/lockout/check`
**Autentikasi**: None (Public)
**Rate Limit**: 20 requests/minute

Cek status lockout untuk email tertentu (untuk login form).

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "isLocked": true,
  "attemptsRemaining": 0,
  "estimatedUnlockTime": "2024-01-15T10:45:00Z"
}
```

### 3. **Login History** - `GET /auth/security/login-history?limit=20`
**Autentikasi**: Required (JWT)
**Rate Limit**: 10 requests/minute

Melihat riwayat login attempts minggu terakhir.

**Response:**
```json
{
  "message": "Login history retrieved successfully",
  "data": [
    {
      "id": "...",
      "ipAddress": "192.168.1.xxx",
      "userAgent": {
        "browser": "Chrome",
        "os": "Windows",
        "device": "Desktop"
      },
      "success": true,
      "failureReason": null,
      "lockoutTriggered": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "summary": {
    "totalAttempts": 25,
    "successfulAttempts": 20,
    "failedAttempts": 5,
    "uniqueIPs": 3
  }
}
```

### 4. **Security Alerts** - `GET /auth/security/alerts`
**Autentikasi**: Required (JWT)
**Rate Limit**: 10 requests/minute

Melihat alert keamanan dan rekomendasi.

**Response:**
```json
{
  "message": "Security alerts retrieved successfully",
  "data": {
    "alerts": [],
    "systemStats": {
      "weeklyFailedAttempts": 150,
      "weeklyLockouts": 5
    },
    "recommendations": [
      "Verify your email address to improve account security",
      "Enable two-factor authentication when available",
      "Regularly review your active sessions"
    ]
  }
}
```

### 5. **Request Account Unlock** - `POST /auth/security/request-unlock`
**Autentikasi**: None (Public)
**Rate Limit**: 2 requests/5 minutes

Self-service request untuk unlock account.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the account exists and is locked, an unlock request has been sent to the email address",
  "status": "request_sent"
}
```

## 🎯 Manfaat untuk User Experience

### 1. **Transparency**
- User bisa melihat status security account mereka
- Informasi yang jelas tentang lockout dan cara mengatasinya
- Riwayat login untuk deteksi aktivitas mencurigakan

### 2. **Self-Service**
- User bisa request unlock sendiri tanpa perlu kontak admin
- Rekomendasi security yang personal dan actionable

### 3. **Security Awareness**
- Educate user tentang aktivitas account mereka
- Early warning untuk aktivitas mencurigakan
- Dorongan untuk menggunakan fitur security tambahan

## 🛡️ Fitur Security yang Terintegrasi

### Privacy Protection
- IP address di-mask untuk privacy (`192.168.1.xxx`)
- User agent di-parse menjadi informasi yang berguna
- No sensitive information exposure

### Rate Limiting
- Semua endpoint di-protect dengan rate limiting
- Public endpoints (lockout check) punya limit lebih tinggi
- Sensitive operations (unlock request) punya limit ketat

### Security Validation
- Input validation untuk semua request
- Proper error handling tanpa information disclosure
- Audit logging untuk semua security operations

## 📱 Frontend Integration Examples

### Login Form Enhancement
```javascript
// Check lockout status sebelum submit
const checkLockout = async (email) => {
  const response = await fetch('/auth/lockout/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await response.json();

  if (data.isLocked) {
    showLockoutMessage(data.estimatedUnlockTime);
    return false;
  }

  return true;
};
```

### Security Dashboard
```javascript
// Security status untuk user dashboard
const loadSecurityStatus = async () => {
  const response = await fetch('/auth/security/status', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();

  displaySecurityStatus(data.data);
  showRecommendations(data.data.recommendations);
};
```

### Login History Component
```javascript
// Login history untuk security page
const loadLoginHistory = async (limit = 10) => {
  const response = await fetch(`/auth/security/login-history?limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();

  renderLoginHistory(data.data);
  showSecuritySummary(data.summary);
};
```

## 🔧 Security Best Practices yang Diterapkan

### 1. **Information Disclosure Prevention**
- Consistent error messages untuk public endpoints
- No revelation of account existence
- Masked sensitive information

### 2. **Rate Limiting Strategy**
- Public endpoints: moderate limits
- Authenticated endpoints: standard limits
- Sensitive operations: strict limits

### 3. **Privacy Protection**
- IP masking untuk user privacy
- User agent parsing untuk informational purposes
- Time-based data retention (7 days default)

### 4. **Audit Trail**
- All security operations logged
- User-initiated security checks tracked
- Failed attempts recorded with context

---

## 📞 Implementation Notes

### Database Queries Optimization
- Efficient indexes untuk login attempt queries
- Pagination support untuk large datasets
- Selective field retrieval untuk performance

### Error Handling
- Graceful degradation jika service unavailable
- Meaningful error messages untuk user
- Proper HTTP status codes

### Extensibility
- Easy to add new security metrics
- Configurable rate limits via environment
- Pluggable alert system untuk future enhancements

**User security endpoints implementation complete!** 🎉