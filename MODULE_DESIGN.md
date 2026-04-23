# GYANDEEP - DETAILED DESIGN (LOGIC DESIGN OF MODULES)

## a. Introduction

Gyandeep is an educational platform (EduTech) built using the MERN stack (MongoDB, Express, React, Node.js) designed to manage students, teachers, classes, and educational activities. The database is designed using MongoDB, a NoSQL database that stores data in JSON-like format (BSON). The core purpose is to securely manage users, track attendance, generate AI-powered quizzes, store notes, and manage grades with gamification features.

The database follows a document-based model ideal for storing dynamic and hierarchical data such as user sessions, quiz attempts, and performance metrics. The key collections are:

- **Users**: Stores login credentials, roles (student/teacher/admin), and gamification data (xp, coins, level, streak).
- **Classes**: Stores class information and student enrollment.
- **Subjects**: Stores subject information and teacher expertise.
- **ClassSessions**: Stores active session codes for attendance tracking.
- **Quizzes/QuizQuestions**: Stores AI-generated quizzes and questions.
- **Attendance**: Records student attendance per session.
- **Grades**: Stores student grades across subjects.
- **CentralizedNotes**: Stores educational notes uploaded by teachers.
- **Notifications**: Stores user notifications.
- **Tickets**: Manages support tickets from students.

Relationships are managed using MongoDB ObjectIds (foreign keys), linking documents across collections.

---

## b. Structure of the Software Package (Structure Chart)

```
Main System
├── Frontend (React + TypeScript + Vite)
│   ├── Dashboard Module
│   ├── Quiz Module
│   ├── Attendance Module
│   ├── Notes Module
│   ├── Grades Module
│   ├── Analytics Module
│   └── Tickets Module
│
├── Backend API (Node.js + Express)
│   ├── Authentication Module
│   │   ├── Register/Login
│   │   ├── JWT Token Handler
│   │   └── Password Reset
│   ├── User Management Module
│   │   ├── User Profile Manager
│   │   ├── RBAC (Role-Based Access)
│   │   └── Face Recognition
│   ├── Class Management Module
│   │   ├── Class Sessions
│   │   ├── Timetable
│   │   └── Student Enrollment
│   ├── Quiz Module
│   │   ├── Quiz Generator (AI)
│   │   ├── Quiz Submission
│   │   └── Auto-grading
│   ├── Attendance Module
│   │   ├── Session Code Generation
│   │   ├── Geofencing
│   │   └── Face Verification
│   ├── Notes Module
│   │   ├── Note Upload
│   │   └── Async Indexing
│   ├── Grades Module
│   ├── Analytics Module
│   └── Notifications Module
│
├── Database Module (MongoDB Atlas + Prisma)
│   ├── User Model
│   ├── Class Model
│   ├── Subject Model
│   ├── ClassSession Model
│   ├── Quiz Model
│   ├── Attendance Model
│   ├── Grade Model
│   ├── Note Model
│   ├── Ticket Model
│   └── ActivityLog Model
│
├── External Services Integration
│   ├── Gemini AI (Quiz Generation)
│   ├── Resend (Email Service)
│   ├── Cloudinary (File Storage)
│   ├── Redis (Caching/Sessions)
│   └── Google OAuth
│
└── Utility Module
    ├── JWT Token Handler
    ├── Error Logger
    ├── Rate Limiter
    └── Input Sanitizer
```

---

## c. Modular Decomposition of the System

### i. Module 1: Authentication and User Management

#### 1. Input
- User credentials (email, password)
- Registration data (name, email, password)
- Google OAuth tokens
- Face image for face recognition login

#### 2. Procedural Details
1. Validate input (email format, password length)
2. Check for existing users (registration)
3. Hash password using bcrypt (12 rounds)
4. Generate JWT access token (15 min) + refresh token (7 days)
5. Handle Google OAuth flow
6. Store/retrieve user details from Users collection
7. Manage role-based access control (student/teacher/admin)
8. Track XP, coins, level, and streak

#### 3. File Input/Output Interface
- Input: JSON payload from frontend via HTTP POST
- Output: JSON responses with status, token, user profile

#### 4. Outputs
- Success/error messages
- JWT access token + refresh token
- User data (name, role, xp, level, streak)

#### 5. Implementation Aspects
- Password hashing with bcrypt (cost factor 12)
- JWT RS256 token authentication
- Prisma schema validation
- Google OAuth 2.0 with Passport.js
- Face recognition using @vladmandic/face-api

---

### ii. Module 2: Class Session and Attendance Tracking

#### 1. Input
- Teacher ID and class ID
- Subject ID
- Session duration
- Optional geofencing parameters
- Optional face verification flag

#### 2. Procedural Details
1. Teacher initiates class session
2. Generate 6-digit unique session code
3. Set session expiry (30 min default, configurable)
4. Store session in ClassSession collection
5. Student submits attendance via session code + location + optional face
6. Verify geofence (if enabled) using Haversine formula
7. Verify face (if enabled) using face embeddings
8. Record attendance in Attendance collection
9. Award XP for on-time/late attendance

#### 3. File Input/Output Interface
- Input: Session start request, attendance submission
- Output: Session code, attendance status

#### 4. Outputs
- Session code for display
- Attendance confirmation
- XP earned notification
- Auto-generated absent marks when session ends

#### 5. Implementation Aspects
- Redis for session code caching (TTL)
- Haversine formula for geofencing
- Cosine similarity for face verification (85% threshold)
- Redis-backed write buffer for batch attendance
- Auto-mark absent students on session end

---

### iii. Module 3: AI Quiz Generation and Submission

#### 1. Input
- Topic/subject name
- Grade level (Class 9-12)
- Number of questions (default: 10)
- Quiz type (pre/main/post)

#### 2. Procedural Details
1. Teacher requests quiz generation
2. Build prompt for Gemini AI
3. Send request to Gemini API
4. Parse AI response into structured questions
5. Store quiz + questions in database
6. Teacher reviews and edits questions
7. Teacher publishes quiz
8. Students attempt quiz with timer
9. Auto-grade on submission
10. Award XP based on score

#### 3. File Input/Output Interface
- Input: Topic + grade level
- Output: JSON with questions array

#### 4. Outputs
- AI-generated quiz questions
- Student scores and percentages
- XP rewards
- Leaderboard updates

#### 5. Implementation Aspects
- Gemini 2.5 Flash/Pro API
- Fire-and-forget async processing
- Redis cache for generated quizzes
- Quiz timer enforcement
- Retry on API failure
- Question difficulty calculation

---

### iv. Module 4: Notes Management

#### 1. Input
- File upload (PDF, images)
- Note metadata (title, unit, class, subject)
- Teacher ID

#### 2. Procedural Details
1. Teacher uploads note file
2. File uploaded to Cloudinary/R2
3. Extract text asynchronously (OCR)
4. Store metadata in CentralizedNote collection
5. Index text for search
6. Track user note access
7. Students view/download notes

#### 3. File Input/Output Interface
- Input: Multipart form data
- Output: Note metadata + file URL

#### 4. Outputs
- Note listing for class/subject
- Searchable notes
- Access tracking statistics
- Extracted text for AI

#### 5. Implementation Aspects
- Multer for file upload
- Cloudinary SDK for storage
- Async text extraction
- Full-text search indexing

---

### v. Module 5: Grades Management

#### 1. Input
- Student ID
- Subject ID
- Score, max score
- Category (quiz/exam/homework)
- Date

#### 2. Procedural Details
1. Teacher creates grade entry
2. Store in Grade collection
3. Calculate running averages
4. Generate teacher insights
5. Notify students of new grades

#### 3. File Input/Output Interface
- Input: Grade data JSON
- Output: Grade records + statistics

#### 4. Outputs
- Student grade cards
- Subject-wise averages
- Performance analytics
- Teacher dashboards

#### 5. Implementation Aspects
- Weighted category calculations
- Grade trends over time
- Analytics aggregation pipeline

---

### vi. Module 6: Notifications and Announcements

#### 1. Input
- User ID targeting
- Type (quiz_result, class_session, ticket_response, etc.)
- Title, message
- Related entity ID

#### 2. Procedural Details
1. System or user triggers notification
2. Store in Notification collection
3. Push to frontend in real-time
4. Mark as read on access

#### 3. File Input/Output Interface
- Input: Notification payload
- Output: Notification list

#### 4. Outputs
- Real-time notifications
- Read/unread status
- Announcement broadcasts

#### 5. Implementation Aspects
- WebSocket for real-time
- Batch announcement delivery
- Read receipt tracking

---

### vii. Module 7: Gamification and Leaderboards

#### 1. Input
- Student activity (quiz, attendance, note share)
- Activity-specific data (score, streak days, views)

#### 2. Procedural Details
1. Activity completed
2. Calculate XP earned:
   - Quiz: 50 base + score bonus
   - Attendance: 10 base + streak bonus
   - Note share: 20 base
3. Update user XP and level
4. Award coins
5. Check badge unlocks
6. Update leaderboard

#### 3. File Input/Output Interface
- Input: Activity event
- Output: XP/coins awarded

#### 4. Outputs
- XP and level progression
- Coin balance
- Badge achievements
- Rankings

#### 5. Implementation Aspects
- XP thresholds per level
- Leaderboard aggregation
- Badge/achievement system
- Streak tracking with reset

---

### viii. Module 8: Support Tickets

#### 1. Input
- Student ticket (subject, category, message)
- Teacher/admin reply
- Priority level

#### 2. Procedural Details
1. Student creates ticket
2. Assign to relevant teacher
3. Teacher/admin responds
4. Track ticket status (open/pending/resolved/closed)
5. Notify student of responses

#### 3. File Input/Output Interface
- Input: Ticket message
- Output: Ticket thread

#### 4. Outputs
- Ticket status
- Reply thread
- Resolution metrics

#### 5. Implementation Aspects
- Category filtering
- Priority queuing
- Assignment routing

---

## d. Database Schema Overview

### Entity Relationship Summary

| Entity | Collection | Key Fields | Relationships |
|--------|-----------|-----------|--------------|
| User | users | odId, email, role, password, xp, level, streak | 1:N classes, 1:N quizzes, 1:N attendance |
| Class | classes | odId, name | 1:N students, 1:N sessions |
| Subject | subjects | odId, name | 1:N classes, 1:N sessions |
| ClassSession | class_sessions | code, expiry, teacherId | 1:N attendance, 1:N quizzes |
| Quiz | quizzes | title, published, questionsJson | 1:N questions, 1:N attempts |
| QuizQuestion | quiz_questions | question, options, correctAnswer | 1:N attempt answers |
| Attendance | attendance | status (present/late/absent), studentId | belongs to session and user |
| Grade | grades | score, category, date | belongs to student, subject, teacher |
| CentralizedNote | centralized_notes | title, content, fileUrl | belongs to class, subject, teacher |
| Ticket | tickets | subject, status, priority | 1:N replies |
| Notification | notifications | type, title, read | belongs to user |

---

## e. API Endpoints Overview

| Module | Endpoint | Method | Description |
|--------|---------|--------|------------|
| Auth | /api/auth/register | POST | Register new user |
| Auth | /api/auth/login | POST | Login with credentials |
| Auth | /api/auth/refresh | POST | Refresh access token |
| Auth | /api/auth/reset-password | POST | Request password reset |
| Users | /api/users/me | GET | Get current user profile |
| Users | /api/users/:id | PUT | Update user profile |
| Sessions | /api/sessions/start | POST | Start class session |
| Sessions | /api/sessions/:code | POST | Submit attendance |
| Quizzes | /api/quiz/generate | POST | Generate AI quiz |
| Quizzes | /api/quiz/:id/submit | POST | Submit quiz attempt |
| Notes | /api/notes | GET/POST | List/upload notes |
| Grades | /api/grades | GET/POST | Get/create grades |
| Tickets | /api/tickets | GET/POST | List/create tickets |
| Admin | /api/admin/stats | GET | Platform statistics |

---

## f. Security Features

1. **Password Security**: Bcrypt hashing with cost factor 12
2. **Token Security**: JWT with short-lived access tokens
3. **Rate Limiting**: Sliding window per IP
4. **Input Validation**: Sanitization and schema validation
5. **Role-Based Access Control**: Middleware for route protection
6. **CORS**: Whitelist-based configuration
7. **Email Enumeration Prevention**: Generic error messages
8. **Sensitive Data Stripping**: Remove passwords/images from responses
9. **Audit Logging**: Track all admin actions

---

## g. Scalability Considerations

1. **Caching**: Redis for session codes, OTP, quiz cache
2. **Async Processing**: Fire-and-forget for AI generation, note indexing
3. **Database Indexing**: Strategic indexes for queries
4. **Connection Pooling**: Prisma connection management
5. **Load Balancing**: Ready for horizontal scaling