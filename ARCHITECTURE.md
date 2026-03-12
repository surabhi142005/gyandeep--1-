# Gyandeep Architecture Design

## 1. Introduction

The Gyandeep Architecture document provides a comprehensive overview of the system's technical design, including the high-level architecture, deployment model, technology stack, and core system flows. This architecture is designed to support a modern educational platform with features like real-time attendance tracking, AI-powered quizzes, face recognition, and comprehensive analytics.

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                       │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                    React SPA (Vite + TypeScript)                         │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│  │  │Dashboard │ │  Quiz    │ │Attendance│ │  Notes   │ │  Analytics   │  │ │
│  │  │  Pages   │ │  Module  │ │  Module  │ │  Module  │ │    Module    │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                              │                                                    │
│                              │ HTTPS (TLS 1.3)                                   │
└──────────────────────────────┼──────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────────────┐
│                              │    API GATEWAY LAYER                             │
│                              ▼                                                    │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                    Express.js Serverless Functions                         │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │ │
│  │  │  /api/auth   │ │  /api/session│ │  /api/quiz  │ │  /api/data  │    │ │
│  │  │  Endpoints  │ │   Endpoints  │ │  Endpoints  │ │  Endpoints  │    │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │ │
│  │  │ /api/notes  │ │/api/attendance│ │/api/grades  │ │/api/tickets  │    │ │
│  │  │  Endpoints  │ │   Endpoints  │ │  Endpoints  │ │  Endpoints   │    │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                              │                                                    │
│                              │                                                    │
└──────────────────────────────┼──────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DATABASE    │    │   OBJECT STORE  │    │   EXTERNAL API  │
│   LAYER       │    │   LAYER         │    │   LAYER         │
├───────────────┤    ├─────────────────┤    ├─────────────────┤
│ MongoDB Atlas │    │  S3/R2 Bucket  │    │  Gemini AI API  │
│   (Primary)   │    │  (File Storage)│    │  Face Service   │
│               │    │                 │    │  (Python)       │
│ - users       │    │ - Session notes│    │                 │
│ - classes     │    │ - Centralized  │    │                 │
│ - sessions    │    │   notes        │    │                 │
│ - quizzes     │    │ - User images  │    │                 │
│ - grades      │    │                 │    │                 │
│ - attendance  │    │                 │    │                 │
│ - tickets     │    │                 │    │                 │
└───────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 3. Technology Stack

### 3.1 Frontend Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 18.x |
| Vite | Build Tool | 5.x |
| TypeScript | Type Safety | 5.x |
| Tailwind CSS | Styling | 3.x |
| React Router | Navigation | 6.x |
| Zustand | State Management | 4.x |
| React Three Fiber | 3D Visualizations | 8.x |
| Recharts | Charts/Graphs | 2.x |
| Web Workers | Background Processing | - |

### 3.2 Backend Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| Express.js | Web Framework | 4.x |
| MongoDB Atlas | Primary Database | - |
| Mongoose | ODM | 8.x |
| JWT | Authentication | - |
| Bcrypt | Password Hashing | 5.x |
| Express Validator | Input Validation | 13.x |
| Multer | File Upload | 1.x |
| Socket.io | Real-time Communication | 4.x |

### 3.3 External Services

| Service | Purpose | Integration |
|---------|---------|--------------|
| Google Gemini | AI Quiz Generation | REST API |
| Face Recognition | Face Verification | Python Service |
| S3/R2 Storage | File Storage | AWS SDK |
| Google OAuth | Social Login | Passport.js |

---

## 4. Architecture Layers

### 4.1 Presentation Layer (Frontend)

```
┌─────────────────────────────────────────────────────────┐
│                  COMPONENTS                              │
├─────────────────────────────────────────────────────────┤
│  Dashboard    │ Quiz      │ Attendance │ Notes        │
│  Components   │ Components│ Components │ Components   │
├─────────────────────────────────────────────────────────┤
│                  HOOKS                                   │
├─────────────────────────────────────────────────────────┤
│  useAuth │ useClassSession │ useQuizWorker │ useTheme │
├─────────────────────────────────────────────────────────┤
│                  SERVICES                               │
├─────────────────────────────────────────────────────────┤
│  authService │ dataService │ locationService │ gemini   │
├─────────────────────────────────────────────────────────┤
│                  UTILS                                  │
├─────────────────────────────────────────────────────────┤
│  API Client │ Storage │ Theme Engine │ i18n           │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Application Layer (Backend)

```
┌─────────────────────────────────────────────────────────┐
│                  ROUTES                                 │
├─────────────────────────────────────────────────────────┤
│  authRoutes │ sessionRoutes │ quizRoutes │ dataRoutes  │
│  noteRoutes │ gradeRoutes   │ ticketRoutes            │
├─────────────────────────────────────────────────────────┤
│                  MIDDLEWARE                             │
├─────────────────────────────────────────────────────────┤
│  authMiddleware │ validation │ rateLimit │ errorHandle │
├─────────────────────────────────────────────────────────┤
│                  CONTROLLERS                            │
├─────────────────────────────────────────────────────────┤
│  authController │ sessionController │ quizController    │
│  noteController │ gradeController   │ ticketController  │
├─────────────────────────────────────────────────────────┤
│                  SERVICES                               │
├─────────────────────────────────────────────────────────┤
│  AuthService │ SessionService │ QuizService │ NoteService│
└─────────────────────────────────────────────────────────┘
```

### 4.3 Data Layer

```
┌─────────────────────────────────────────────────────────┐
│                  MODELS                                 │
├─────────────────────────────────────────────────────────┤
│  User │ Class │ Session │ Quiz │ Grade │ Attendance    │
│  Note │ Ticket │ Notification │ Announcement           │
├─────────────────────────────────────────────────────────┤
│                  DATABASE                              │
├─────────────────────────────────────────────────────────┤
│  MongoDB Atlas Collections + Indexes                   │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Core System Flows

### 5.1 Authentication Flow

```
User Login
    │
    ▼
┌─────────────────┐
│  Login Page     │
│  (Email/Password│
│   or Face)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auth Service   │
│  - Validate     │
│  - JWT Generate │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Response       │
│  - Access Token │
│  - Refresh Token│
│  - User Profile │
└─────────────────┘
```

### 5.2 Class Session & Attendance Flow

```
Teacher starts session
    │
    ▼
┌─────────────────────────┐
│ Generate Session Code   │
│ (6-digit)               │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Store in MongoDB       │
│ (class_sessions)        │
└────────┬────────────────┘
         │
         ▼
    Student joins session
         │
         ▼
┌─────────────────────────┐
│ 1. Verify Location     │
│    (Geofencing)        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 2. Verify Face         │
│    (Face Recognition)  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 3. Record Attendance   │
│    in MongoDB          │
└─────────────────────────┘
```

### 5.3 Quiz Flow

```
Teacher creates quiz
    │
    ▼
┌─────────────────────────┐
│ AI generates questions  │
│ (Gemini API)           │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Store quiz in MongoDB  │
│ (quizzes, questions)  │
└────────┬────────────────┘
         │
         ▼
    Student takes quiz
         │
         ▼
┌─────────────────────────┐
│ Submit answers          │
│ (Web Worker processing) │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Auto-grade answers      │
│ Store attempt + grades  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Award XP & Update       │
│ Leaderboard             │
└─────────────────────────┘
```

### 5.4 Note Management Flow

```
Teacher uploads note
    │
    ▼
┌─────────────────────────┐
│ File upload to S3/R2   │
│ (Storage bucket)       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Extract text (OCR/LLM) │
│ Store metadata in DB   │
└────────┬────────────────┘
         │
         ▼
    Student accesses note
         │
         ▼
┌─────────────────────────┐
│ Track access in        │
│ user_note_accesses     │
└─────────────────────────┘
```

---

## 6. Deployment Architecture

### 6.1 Serverless Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                         CDN (CloudFlare/Vercel)                 │
│              Static Assets, HTML, JS, CSS, Images               │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (Vercel Functions)               │
│              Express Routes, JWT Validation, Rate Limit          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  MongoDB Atlas │   │   S3/R2 Bucket │   │  External APIs  │
│   (Database)   │   │   (Storage)    │   │  (Gemini/Face) │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

### 6.2 Environment Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| MONGODB_URI | MongoDB Atlas connection string | Yes |
| JWT_SECRET | Secret for JWT token signing | Yes |
| SESSION_SECRET | Session encryption secret | Yes |
| GEMINI_API_KEY | Google Gemini AI API key | Yes |
| FACE_SERVICE_URL | Face recognition service endpoint | Yes |
| AWS_ACCESS_KEY_ID | S3/R2 access key | Yes |
| AWS_SECRET_ACCESS_KEY | S3/R2 secret key | Yes |
| AWS_BUCKET_NAME | Storage bucket name | Yes |
| AWS_REGION | AWS region | Yes |
| REDIS_URL | Redis connection (optional) | No |

---

## 7. Security Architecture

### 7.1 Authentication Security

- **JWT Tokens**: Access tokens (15 min) + Refresh tokens (7 days)
- **Password Hashing**: Bcrypt with cost factor 12
- **Face Recognition**: 85% confidence threshold
- **Session Binding**: IP + User-Agent validation

### 7.2 API Security

- **TLS 1.3**: All communications encrypted
- **Rate Limiting**: Per-endpoint limits
- **Input Validation**: Sanitized and validated
- **CORS**: Whitelist-based configuration
- **CSRF**: Token-based protection

### 7.3 Data Security

- **Field-Level Encryption**: Sensitive data encrypted
- **Face Embeddings**: AES-256 encryption
- **Audit Logging**: All actions logged
- **Access Control**: Role-based permissions

---

## 8. Scalability Design

### 8.1 Horizontal Scaling

- **Serverless Functions**: Auto-scale on demand
- **Database Connection Pooling**: Efficient resource use
- **CDN Caching**: Static asset optimization

### 8.2 Performance Optimizations

- **Indexing**: Strategic indexes on frequent queries
- **Caching**: Redis for session/response caching
- **Web Workers**: Background task offloading
- **Lazy Loading**: Component-level code splitting

---

## 9. System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS                                          │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│   │ Student  │  │ Teacher  │  │  Admin   │  │ Parent   │                  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│        │             │             │             │                          │
└────────┼─────────────┼─────────────┼─────────────┼──────────────────────────┘
         │             │             │             │
         │             │             │             │
         ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GYANDEEP PLATFORM                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        FRONTEND (React SPA)                          │   │
│  │   Dashboard │ Quiz │ Attendance │ Notes │ Grades │ Tickets │ AI      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    BACKEND (Express.js)                              │   │
│  │   Auth │ Session │ Quiz │ Notes │ Grades │ Tickets │ Analytics       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                    ┌─────────────────┼─────────────────┐                     │
│                    ▼                 ▼                 ▼                     │
│           ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│           │  MongoDB    │   │    S3/R2   │   │   Gemini   │              │
│           │   Atlas    │   │  Storage   │   │    API     │              │
│           └─────────────┘   └─────────────┘   └─────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Non-Functional Requirements

### 10.1 Performance

- API response time: < 200ms (p95)
- Page load time: < 3 seconds
- Database queries: Indexed for fast retrieval

### 10.2 Availability

- Uptime: 99.5% SLA
- Graceful degradation for non-critical features

### 10.3 Security

- OWASP Top 10 compliance
- Regular security audits
- GDPR-compliant data handling

### 10.4 Maintainability

- Modular architecture
- Comprehensive documentation
- CI/CD pipeline for deployments
