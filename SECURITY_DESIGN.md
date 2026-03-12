# Gyandeep Security Design

## Overview
This document outlines the security architecture, threat model, and mitigation strategies for the Gyandeep educational platform. It covers authentication, authorization, data protection, API security, and compliance considerations.

---

## 1. Security Architecture

### Layered Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  - HTTPS/TLS 1.3                                            │
│  - CSP Headers                                              │
│  - XSS Protection                                           │
│  - CSRF Tokens                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│  - JWT Authentication                                       │
│  - Role-Based Access Control (RBAC)                        │
│  - Input Validation & Sanitization                         │
│  - Rate Limiting                                            │
│  - Request Throttling                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                             │
│  - Field-Level Encryption                                   │
│  - Database Access Controls                                 │
│  - Audit Logging                                            │
│  - Data Anonymization                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                      │
│  - VPC Isolation                                            │
│  - WAF / DDoS Protection                                    │
│  - Secrets Management                                       │
│  - Backup & Disaster Recovery                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Security

### 2.1 Multi-Factor Authentication

#### Password-Based Authentication
```
ALGORITHM: AuthenticateWithPassword(email, password)

1. NORMALIZE email (lowercase, trim whitespace)
2. LOOKUP user BY email
   IF NOT FOUND:
     DELAY 2 seconds (prevent timing attacks)
     RETURN "Invalid credentials"

3. VERIFY password using bcrypt (cost factor 12)
   IF verification FAILS:
     RECORD failed attempt
     IF failures > 5:
       LOCK account for 15 minutes
     DELAY 2 seconds
     RETURN "Invalid credentials"

4. GENERATE JWT tokens:
   - Access Token: 15 minutes expiry
   - Refresh Token: 7 days expiry (stored securely)

5. RECORD successful login with:
   - IP address
   - User agent
   - Timestamp
   - Device fingerprint

6. RETURN tokens and user profile
```

#### Face-Based Authentication
```
ALGORITHM: AuthenticateWithFace(imageData)

1. VALIDATE imageData:
   - Check minimum resolution (640x480)
   - Verify image format (JPEG/PNG)
   - Check file size < 5MB

2. DETECT face in image
   IF no face OR multiple faces detected:
     RETURN error: "Face detection failed"

3. GENERATE face embedding from image

4. COMPARE embedding against stored embeddings:
   - Use cosine similarity
   - Threshold: 0.85 (85% confidence)

5. IF match found:
   GENERATE JWT tokens
   RECORD authentication event
   RETURN success
6. ELSE:
   RECORD failed attempt
   RETURN error: "Face not recognized"
```

### 2.2 JWT Token Management

```
TOKEN STRUCTURE:
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "role": "student|teacher|admin",
    "classId": "class_id",
    "iat": 1234567890,
    "exp": 1234568790,
    "jti": "unique_token_id"
  },
  "signature": "computed_signature"
}

REFRESH FLOW:
1. Client sends expired access token + valid refresh token
2. Server validates refresh token (check expiry, revocation status)
3. Server generates new access token
4. Server may rotate refresh token (optional)
5. Return new token pair
```

### 2.3 Session Security

```
ALGORITHM: CreateSecureSession(userId, deviceInfo)

1. GENERATE session ID (UUID v4, cryptographically random)

2. CREATE session record:
   {
     sessionId: UUID,
     userId: userId,
     createdAt: NOW(),
     expiresAt: NOW() + 30 minutes,
     lastActivity: NOW(),
     deviceFingerprint: HASH(deviceInfo),
     ipAddress: currentIP,
     userAgent: currentUserAgent,
     isValid: true
   }

3. STORE session in Redis (for fast lookup) with TTL

4. RETURN session cookie (HttpOnly, Secure, SameSite=Strict)

SESSION VALIDATION:
- Check session exists and is valid
- Check not expired
- Check IP address matches (optional, configurable)
- Check device fingerprint matches (optional)
- Update lastActivity on each request
```

---

## 3. Authorization & Access Control

### 3.1 Role-Based Access Control (RBAC)

```
ROLES AND PERMISSIONS:

┌─────────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Permission  │ Student │ Teacher │ Admin  │ Parent  │ Viewer  │ System  │
├─────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ view_own_grades    │ ✓   │ ✓   │ ✓   │ ✓   │ ✗   │ ✓   │
│ view_class_grades  │ ✗   │ ✓   │ ✓   │ ✗   │ ✗   │ ✓   │
│ edit_grades        │ ✗   │ ✓   │ ✓   │ ✗   │ ✗   │ ✓   │
│ view_own_attendance│ ✓   │ ✓   │ ✓   │ ✓   │ ✗   │ ✓   │
│ manage_attendance  │ ✗   │ ✓   │ ✓   │ ✗   │ ✗   │ ✓   │
│ create_quiz        │ ✗   │ ✓   │ ✓   │ ✗   │ ✗   │ ✓   │
│ take_quiz          │ ✓   │ ✓   │ ✓   │ ✗   │ ✗   │ ✓   │
│ create_session     │ ✗   │ ✓   │ ✓   │ ✗   │ ✗   │ ✓   │
│ manage_users       │ ✗   │ ✗   │ ✓   │ ✗   │ ✗   │ ✓   │
│ manage_classes     │ ✗   │ ✗   │ ✓   │ ✗   │ ✗   │ ✓   │
│ view_analytics     │ ✓   │ ✓   │ ✓   │ ✓   │ ✗   │ ✓   │
│ manage_settings    │ ✗   │ ✗   │ ✓   │ ✗   │ ✗   │ ✓   │
└─────────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

### 3.2 Permission Check Algorithm

```
ALGORITHM: CheckPermission(userId, permission, resourceId)

INPUT:
  - userId: string
  - permission: string (e.g., "edit_grades")
  - resourceId: string (optional, for resource-level checks)

1. FETCH user FROM users WHERE _id = userId
2. LET userRole = user.role
3. LET userClassId = user.classId

4. LOOKUP permission in ROLE_PERMISSIONS[userRole]
   IF permission NOT IN rolePermissions:
     RETURN false

5. IF resourceId IS PROVIDED:
   SWITCH permission:
     CASE "view_class_grades", "manage_class":
       VERIFY user.classId == resource.classId
       IF teacher: VERIFY user.teacherClasses INCLUDES resourceId
     CASE "view_student_profile":
       VERIFY user.role == "admin" OR 
              user.classId == resource.classId OR 
              user._id == resourceId

6. RETURN true
```

### 3.3 Class/Resource Isolation

```
ALGORITHM: VerifyResourceAccess(user, resource, action)

1. IF user.role == "admin":
   RETURN true (admin has full access)

2. SWITCH resource.type:
   CASE "class":
     IF user.role == "teacher":
       RETURN resource.teacherIds INCLUDES user._id
     ELSE:
       RETURN resource.studentIds INCLUDES user._id
   
   CASE "quiz":
     RETURN resource.classId == user.classId OR 
            resource.createdBy == user._id
   
   CASE "note":
     RETURN resource.classId == user.classId
   
   CASE "session":
     RETURN resource.classId == user.classId

3. RETURN false
```

---

## 4. Data Protection

### 4.1 Sensitive Data Classification

```
DATA CLASSIFICATION:

┌─────────────────────┬────────────────────────────────┬──────────────────┐
│ Classification      │ Examples                       │ Protection       │
├─────────────────────┼────────────────────────────────┼──────────────────┤
│ PII (Personal)      │ Name, email, phone, address   │ Encryption       │
│ Biometric           │ Face embeddings, images        │ AES-256 + Access │
│ Financial           │ Payment info                   │ Tokenization     │
│ Educational         │ Grades, attendance records    │ Access Control   │
│ Authentication      │ Passwords, tokens, secrets     │ Hashing + Vault  │
│ System              │ Logs, config, API keys        │ Restricted Access│
└─────────────────────┴────────────────────────────────┴──────────────────┘
```

### 4.2 Password Security

```
ALGORITHM: SecurePasswordHash(password)

1. VALIDATE password requirements:
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 number
   - At least 1 special character

2. GENERATE salt (16 bytes, cryptographically random)

3. HASH password using bcrypt:
   - Cost factor: 12
   - Salt: generated salt

4. STORE: $2b$12$[salt][hash]

PASSWORD RESET FLOW:
1. User requests reset with email
2. GENERATE secure token (32 bytes, random)
3. STORE token with expiry (15 minutes) in Redis
4. SEND email with reset link
5. User clicks link, validates token
6. User enters new password
7. VALIDATE new password strength
8. HASH new password
9. UPDATE user record
10. INVALIDATE all existing sessions
11. SEND confirmation email
```

### 4.3 Face Data Protection

```
FACE DATA STORAGE SECURITY:

1. ENCRYPTION AT REST:
   - Face embeddings encrypted with AES-256-GCM
   - Encryption key stored in secrets manager
   - Key rotation every 90 days

2. FACE IMAGE HANDLING:
   - Original images NOT stored after embedding extraction
   - Only encrypted embeddings stored
   - Images processed in memory, never written to disk

3. ACCESS CONTROLS:
   - Only authentication service can read embeddings
   - Write access requires admin approval
   - Audit log for all face data access

4. PRIVACY:
   - No face data in logs or error messages
   - No face data in API responses (only boolean results)
   - GDPR-compliant deletion (remove all embeddings)
```

### 4.4 Data Encryption

```
FIELD-LEVEL ENCRYPTION:

1. SENSITIVE FIELDS TO ENCRYPT:
   - users.phone
   - users.address
   - users.emergencyContact
   - face_embeddings.embedding
   - tickets.description (if contains sensitive info)

2. ENCRYPTION PROCESS:
   - Generate data key from KMS
   - Encrypt field value using AES-256-GCM
   - Store encrypted value with IV (initialization vector)
   - Store encrypted data key with field record

3. DECRYPTION PROCESS:
   - Retrieve encrypted data key
   - Decrypt data key using KMS
   - Decrypt field value using decrypted key
   - Return plaintext (never cache decrypted)

ENCRYPTION AT TRANSPORT:
- TLS 1.3 for all connections
- Certificate pinning for mobile apps
- HSTS header (max-age: 31536000)
```

---

## 5. API Security

### 5.1 Request Validation

```
ALGORITHM: ValidateAPIRequest(request)

1. CHECK Content-Type is application/json
2. VALIDATE Content-Length < 1MB
3. PARSE JSON body (catch and sanitize errors)
4. FOR EACH field in body:
   a. VALIDATE type (string, number, boolean, array, object)
   b. VALIDATE length limits
   c. SANITIZE string inputs (escape HTML, remove null bytes)
   d. VALIDATE against whitelist (if applicable)

5. VALIDATE query parameters:
   - Sanitize special characters
   - Validate types
   - Check for injection attempts

6. VALIDATE headers:
   - User-Agent present
   - Accept header valid
   - No suspicious headers

7. RETURN validated and sanitized request
```

### 5.2 Rate Limiting

```
RATE LIMIT CONFIGURATION:

┌────────────────────────┬─────────────┬────────────────┐
│ Endpoint               │ Limit       │ Window         │
├────────────────────────┼─────────────┼────────────────┤
│ /api/auth/login        │ 5 requests  │ 15 minutes     │
│ /api/auth/register     │ 3 requests  │ 1 hour         │
│ /api/auth/face         │ 10 requests │ 1 minute       │
│ /api/quiz/submit       │ 20 requests │ 1 minute       │
│ /api/attendance/mark    │ 10 requests │ 1 minute       │
│ /api/search            │ 30 requests │ 1 minute       │
│ /api/chat              │ 60 requests │ 1 minute       │
│ General API            │ 100 requests│ 1 minute       │
└────────────────────────┴─────────────┴────────────────┘

RATE LIMIT ALGORITHM:

ALGORITHM: CheckRateLimit(userId, endpoint)

1. CONSTRUCT key = "rate_limit:{userId}:{endpoint}"
2. GET current count from Redis
3. IF count >= limit:
     RETURN 429 Too Many Requests
4. ELSE:
     INCREMENT count
     SET expiry = window duration
     RETURN continue
```

### 5.3 SQL/NoSQL Injection Prevention

```
INPUT SANITIZATION RULES:

1. STRING INPUTS:
   - Escape special characters: ' " \ ; -- /* */
   - Use parameterized queries only
   - Strip HTML tags (unless rich text allowed)

2. MONGO-DB QUERIES:
   - NEVER use $where with user input
   - Use query builders, not string concatenation
   - Validate field names (no $prefixed)

3. SEARCH INPUTS:
   - Sanitize regex patterns
   - Limit input length to 200 characters
   - Escape special search characters

VALIDATION EXAMPLE:
- Input: "'; DROP TABLE users; --"
- Sanitized: "DROP TABLE users removed, input truncated"
- Query uses: { $eq: "sanitized_input" }
```

### 5.4 CORS Configuration

```
CORS HEADERS:

Access-Control-Allow-Origin: https://gyandeep.app
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
Access-Control-Expose-Headers: X-Total-Count, X-Page-Number

RULES:
1. NO wildcard origins (*)
2. Validate Origin header against whitelist
3. Only allow necessary methods
4. Cache preflight responses (24 hours)
5. Strip sensitive headers from responses
```

---

## 6. Threat Mitigation

### 6.1 Cross-Site Scripting (XSS)

```
XSS PREVENTION:

1. OUTPUT ENCODING:
   - Encode all user-generated content before rendering
   - Context-aware encoding (HTML, JS, CSS, URL)
   - Use React's default escaping

2. CONTENT SECURITY POLICY:
   Content-Security-Policy:
     default-src 'self';
     script-src 'self';
     style-src 'self' 'unsafe-inline';
     img-src 'self' data: https:;
     connect-src 'self' https://api.gyandeep.app;
     frame-ancestors 'none';

3. HTTP HEADERS:
   X-XSS-Protection: 1; mode=block
   X-Content-Type-Options: nosniff
   Referrer-Policy: strict-origin-when-cross-origin
```

### 6.2 Cross-Site Request Forgery (CSRF)

```
CSRF PROTECTION:

1. CSRF TOKEN:
   - Generate 32-byte random token per session
   - Store in HttpOnly cookie
   - Include in all state-changing requests

2. TOKEN VALIDATION:
   ALGORITHM: ValidateCSRFToken(request)
   
   1. GET token from cookie: csrftoken
   2. GET token from header: X-CSRF-Token
   3. IF tokens don't match:
        RETURN 403 Forbidden
   4. IF token expired or invalid:
        RETURN 403 Forbidden
   5. RETURN true

3. COOKIE ATTRIBUTES:
   Set-Cookie: csrftoken=xxx; Secure; HttpOnly; SameSite=Strict
```

### 6.3 DDoS Protection

```
DDOS MITIGATION:

1. RATE LIMITING:
   - Per-IP rate limits at CDN level
   - Per-user rate limits at API gateway
   - Automatic blocking of abusive IPs

2. CDN PROTECTION:
   - Cloudflare / AWS CloudFront
   - Bot detection and challenge
   - JavaScript challenges for suspicious traffic
   - Managed WAF rules

3. TRAFFIC ANALYSIS:
   - Monitor for anomalous patterns
   - Alert on sudden traffic spikes
   - Auto-scale based on traffic

4. INFRASTRUCTURE:
   - Load balancers with health checks
   - Multiple availability zones
   - CDN caching for static assets
```

### 6.4 Session Hijacking Prevention

```
SESSION SECURITY MEASURES:

1. SECURE SESSION COOKIES:
   - HttpOnly: Prevents JavaScript access
   - Secure: HTTPS only
   - SameSite: Strict or Lax
   - Session ID: 128-bit random

2. SESSION BINDING:
   - Bind to IP address (configurable)
   - Bind to User-Agent
   - Re-authenticate for sensitive actions

3. SESSION FIXATION PREVENTION:
   - Regenerate session ID on login
   - Invalidate old sessions on login
   - Timeout inactive sessions

4. CONCURRENT SESSION LIMITS:
   - Maximum 3 concurrent sessions per user
   - Option to logout other sessions
```

---

## 7. Audit & Monitoring

### 7.1 Security Audit Logging

```
AUDIT LOG EVENTS:

┌─────────────────────┬─────────────────────────────────────────┐
│ Event Category      │ Events                                 │
├─────────────────────┼─────────────────────────────────────────┤
│ Authentication      │ Login, logout, failed login, password  │
│                     │ reset, account lockout                  │
│ Authorization        │ Permission denied, role change         │
│ Data Access         │ View grades, view attendance,           │
│                     │ export data                             │
│ Data Modification   │ Create, update, delete records         │
│ Sensitive Actions   │ Face registration, settings change,    │
│                     │ admin actions                           │
│ Security Events     │ Rate limit exceeded, suspicious IP,    │
│                     │ injection attempt detected             │
└─────────────────────┴─────────────────────────────────────────┘

AUDIT LOG STRUCTURE:
{
  timestamp: "2024-01-15T10:30:00Z",
  eventType: "authentication.login",
  userId: "user_123",
  userRole: "student",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  resource: "/api/auth/login",
  success: true,
  metadata: {
    method: "password",
    sessionId: "sess_abc123"
  }
}
```

### 7.2 Security Monitoring

```
MONITORING DASHBOARD:

1. REAL-TIME ALERTS:
   - Failed login attempts > 10/minute
   - Unusual geographic login
   - API error rate > 5%
   - Database query anomalies
   
2. DAILY REPORTS:
   - User activity summary
   - Failed authentication summary
   - API usage statistics
   - Security incident count

3. INCIDENT RESPONSE:
   - Automated alerts via PagerDuty/Slack
   - Runbook for common incidents
   - Escalation procedures
   - Post-incident analysis
```

---

## 8. Compliance

### 8.1 Data Privacy (GDPR)

```
GDPR COMPLIANCE:

1. DATA SUBJECT RIGHTS:
   - Right to access: Provide all user data in JSON
   - Right to rectification: Allow profile updates
   - Right to erasure: Delete all personal data
   - Right to portability: Export data in standard format

2. DATA MINIMIZATION:
   - Collect only necessary fields
   - No unnecessary data in logs
   - Anonymize data in analytics

3. CONSENT MANAGEMENT:
   - Clear consent checkboxes
   - Granular consent options
   - Easy consent withdrawal
   - Consent audit trail

4. DATA RETENTION:
   - Define retention periods per data type
   - Auto-delete after retention period
   - Archive inactive accounts (anonymize)
```

### 8.2 Child Data Protection (COPPA)

```
COPPA COMPLIANCE (for educational apps with minors):

1. AGE VERIFICATION:
   - School-verified accounts only
   - No personal account creation for under-13

2. PARENTAL CONSENT:
   - Written consent from school/parent
   - Verify parental identity
   - Document consent

3. DATA RESTRICTIONS:
   - No behavioral advertising
   - No sale of children's data
   - Limited data collection
   - No location tracking for minors

4. TRANSPARENT POLICIES:
   - Clear privacy policy
   - Data collection disclosure
   - Parental access/deletion rights
```

---

## 9. Security Checklist

### Development Security
- [ ] All inputs validated and sanitized
- [ ] Parameterized queries only (no string concatenation)
- [ ] Secrets in environment variables, not in code
- [ ] Dependencies regularly updated
- [ ] Code review for security issues
- [ ] Static application security testing (SAST)
- [ ] Dynamic application security testing (DAST)

### Deployment Security
- [ ] TLS 1.3 configured
- [ ] Security headers set
- [ ] Rate limiting enabled
- [ ] WAF rules configured
- [ ] CDN configured
- [ ] Database access restricted
- [ ] Secrets in vault

### Operational Security
- [ ] 24/7 monitoring
- [ ] Incident response plan
- [ ] Regular security audits
- [ ] Penetration testing (annual)
- [ ] Backup testing
- [ ] Key rotation schedule

---

## Summary

| Security Domain | Key Measures |
|-----------------|--------------|
| Authentication | MFA (password + face), JWT with RS256, session binding |
| Authorization | RBAC, resource-level checks, class isolation |
| Data Protection | Field encryption, bcrypt hashing, face data protection |
| API Security | Rate limiting, input validation, CORS, injection prevention |
| Threat Mitigation | CSP, CSRF tokens, DDoS protection, session security |
| Monitoring | Audit logging, real-time alerts, incident response |
| Compliance | GDPR, COPPA data handling, retention policies |
