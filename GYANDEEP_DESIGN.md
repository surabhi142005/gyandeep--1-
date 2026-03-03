# GYANDEEP — Complete System Design Document
**AI-Powered Smart Classroom System | Version 2.0 | March 2026**

---

## 1. ARCHITECTURAL DESIGN

### 1.1 High-Level Architecture (3-Tier)

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ Landing  │  │ Student  │  │ Teacher  │  │    Admin     │    │
│  │  Page    │  │Dashboard │  │Dashboard │  │  Dashboard   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
│                                                                 │
│  React 19 + Vite + Tailwind CSS + Framer Motion                │
│  SSE (Server-Sent Events) | Face-api.js                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API + WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LAYER                             │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │   Auth   │  │   Quiz   │  │Attendance│  │   Admin      │    │
│  │  Routes  │  │  Routes  │  │  Routes  │  │   Routes     │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
│                                                                 │
│  Node.js + Express | JWT Auth | RBAC Middleware                 │
│  Rate Limiter | Input Sanitizer | Idempotency Guard             │
│  Google Gemini AI | BullMQ Job Queue                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ SQL + Redis + File I/O
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐                   │
│  │ SQLite   │  │  Redis   │  │  File Store  │                   │
│  │ (WAL)    │  │ (Cache)  │  │  (JSON/Blob) │                   │
│  └──────────┘  └──────────┘  └──────────────┘                   │
│                                                                 │
│  WAL mode | ACID Transactions | Attendance Buffer               │
│  Prometheus Metrics | NDJSON Audit Archives                     │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Request Flow

```
  User Action
      │
      ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  React   │───▶│  Fetch   │───▶│ Express  │───▶│  SQLite  │
│   UI     │    │  + JWT   │    │  Server  │    │   DB     │
│          │◀───│  Header  │◀───│  + RBAC  │◀───│  (WAL)   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
      │                              │
      │       SSE Broadcast          │
      ◀──────────────────────────────┘
```

---

## 2. MODULE DESIGN

```
┌─────────────────────────────────────────────────────────────────┐
│                     GYANDEEP MODULES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  M1: AUTH       │    │  M2: SESSION    │                     │
│  │                 │    │                 │                     │
│  │ • Email Login   │    │ • 6-Digit Code  │                     │
│  │ • Google OAuth  │    │ • 10-min Expiry │                     │
│  │ • Face ID       │    │ • Live Join     │                     │
│  │ • JWT Tokens    │    │ • PIN Fallback  │                     │
│  │ • Password      │    │                 │                     │
│  │   Reset + OTP   │    │                 │                     │
│  └─────────────────┘    └─────────────────┘                     │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  M3: AI QUIZ    │    │  M4: GRADING    │                     │
│  │                 │    │                 │                     │
│  │ • Upload Notes  │    │ • Score Calc    │                     │
│  │ • Gemini AI Gen │    │ • Bulk Import   │                     │
│  │ • 5 MCQ Output  │    │ • Per-Q Explain │                     │
│  │ • Teacher Edit  │    │ • Trend Charts  │                     │
│  │ • Publish Quiz  │    │ • Auto-Grade AI │                     │
│  └─────────────────┘    └─────────────────┘                     │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  M5: ATTENDANCE │    │  M6: ANALYTICS  │                     │
│  │                 │    │                 │                     │
│  │ • Face Detect   │    │ • Performance   │                     │
│  │ • Live Table    │    │ • Attendance    │                     │
│  │ • CSV Export    │    │ • Engagement    │                     │
│  │ • Blockchain    │    │ • Weekly AI     │                     │
│  │   (optional)    │    │   Insights      │                     │
│  └─────────────────┘    └─────────────────┘                     │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  M7: ADMIN      │    │  M8: REALTIME   │                     │
│  │                 │    │                 │                     │
│  │ • Bulk Import   │    │ • SSE (Server-  │                     │
│  │ • Audit Logs    │    │   Sent Events)  │                     │
│  │ • Email Health  │    │ • Notifications │                     │
│  │ • User Mgmt    │    │ • Presence      │                     │
│  │ • Timetable    │    │   Tracking      │                     │
│  └─────────────────┘    └─────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. DATABASE DESIGN

### 3.1 Table Summary

```
┌─────────────────────┬──────────────────────────────────────────┐
│      TABLE          │           PURPOSE                        │
├─────────────────────┼──────────────────────────────────────────┤
│ users               │ All user accounts (student/teacher/admin)│
│ attendance          │ Session attendance records               │
│ grades              │ Student scores per quiz/assignment       │
│ timetable_entries   │ Weekly class schedule                    │
│ tickets             │ Helpdesk support tickets                 │
│ ticket_replies      │ Replies on tickets (FK → tickets)        │
│ question_bank       │ Stored quiz questions                    │
│ tags_presets        │ Subject-wise tag templates               │
│ teacher_insights    │ AI-generated weekly insights             │
│ audit_logs          │ Immutable action audit trail             │
│ otp                 │ One-time passwords for 2FA               │
│ idempotency_keys    │ Duplicate request prevention             │
│ classes             │ Class/section definitions                │
└─────────────────────┴──────────────────────────────────────────┘
```

### 3.2 Key Columns

```
┌─ users ──────────────────────────────────────────────────────┐
│ id (PK) │ name │ email (UQ) │ role │ password │ faceImage   │
│ googleId │ emailVerified │ preferences │ classId             │
└──────────────────────────────────────────────────────────────┘

┌─ grades ─────────────────────────────────────────────────────┐
│ id (PK) │ studentId │ subject │ category │ title │ score     │
│ maxScore │ weight │ date │ teacherId │ createdAt              │
└──────────────────────────────────────────────────────────────┘

┌─ attendance ─────────────────────────────────────────────────┐
│ id (PK) │ session_id │ student_id │ status │ verified_at     │
│ UNIQUE(session_id, student_id) — prevents duplicate marks    │
└──────────────────────────────────────────────────────────────┘

┌─ tickets ────────────────────────────────────────────────────┐
│ id (PK) │ userId │ userName │ subject │ message │ category   │
│ status │ createdAt │ updatedAt │ version (optimistic lock)   │
└──────────────────────────────────────────────────────────────┘

┌─ timetable_entries ──────────────────────────────────────────┐
│ id (PK) │ day │ startTime │ endTime │ subject │ teacherId    │
│ classId │ room │ createdAt │ updatedAt                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. ER DIAGRAM (Entity Relationship)

```
  ┌──────────┐         ┌──────────────┐         ┌──────────┐
  │          │ creates │              │ contains │          │
  │  TEACHER ├────────▶│   SESSION    ├─────────▶│   QUIZ   │
  │          │  1   *  │              │  1    *  │          │
  └────┬─────┘         └──────┬───────┘         └────┬─────┘
       │                      │                      │
       │                      │ tracks               │ records
       │                      ▼                      ▼
       │               ┌──────────────┐       ┌──────────┐
       │               │              │       │          │
       │               │  ATTENDANCE  │       │  GRADES  │
       │               │              │       │          │
       │               └──────┬───────┘       └────┬─────┘
       │                      │                    │
       │                      │ marks              │ achieves
       │                      ▼                    ▼
       │               ┌──────────────┐            │
       │               │              │◀───────────┘
       │               │   STUDENT    │
       │               │              │
       │               └──────┬───────┘
       │                      │
       │                      │ raises
       ▼                      ▼
  ┌──────────┐         ┌──────────────┐
  │          │ reviews │              │
  │  ADMIN   ├────────▶│   TICKETS    │
  │          │         │              │
  └──────────┘         └──────┬───────┘
       │                      │
       │ reads                │ has
       ▼                      ▼
  ┌──────────┐         ┌──────────────┐
  │  AUDIT   │         │   TICKET     │
  │  LOGS    │         │   REPLIES    │
  └──────────┘         └──────────────┘


  RELATIONSHIPS:
  ┌────────────────────────────────────────────────────────┐
  │  Teacher  ──(1:N)──▶  Session                         │
  │  Session  ──(1:N)──▶  Attendance                      │
  │  Session  ──(1:N)──▶  Quiz                            │
  │  Student  ──(N:1)──▶  Attendance                      │
  │  Student  ──(1:N)──▶  Grades                          │
  │  Student  ──(1:N)──▶  Tickets                         │
  │  Ticket   ──(1:N)──▶  Ticket_Replies (FK cascade)     │
  │  User     ──(1:N)──▶  Audit_Logs                      │
  │  Teacher  ──(1:N)──▶  Timetable_Entries               │
  └────────────────────────────────────────────────────────┘
```

---

## 5. ACTIVITY CHARTS

### 5.1 Login Flow

```
  ┌─────────┐
  │  START  │
  └────┬────┘
       ▼
  ┌──────────────┐
  │ Enter Email  │
  │ + Password   │
  └──────┬───────┘
         ▼
  ┌──────────────────┐     NO     ┌──────────────┐
  │ Valid Credentials?├──────────▶│ Show Error   │
  └──────┬───────────┘            └──────────────┘
         │ YES
         ▼
  ┌──────────────────┐
  │ Generate JWT     │
  │ Token (8-hr)     │
  └──────┬───────────┘
         ▼
  ┌──────────────────┐
  │ Check User Role  │
  └──────┬───────────┘
         ▼
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│Student │ │Teacher │ │ Admin  │
│Dash    │ │Dash    │ │ Dash   │
└────────┘ └────────┘ └────────┘
```

### 5.2 AI Quiz Generation Flow

```
  ┌─────────┐
  │  START  │
  └────┬────┘
       ▼
  ┌──────────────────┐
  │ Teacher Uploads  │
  │ Notes (PDF/Text) │
  └──────┬───────────┘
         ▼
  ┌──────────────────┐
  │ Extract Text     │
  │ Content          │
  └──────┬───────────┘
         ▼
  ┌──────────────────┐
  │ Send to Gemini   │
  │ AI with Prompt:  │
  │ "Generate 5 MCQs"│
  └──────┬───────────┘
         ▼
  ┌──────────────────┐   FAIL   ┌──────────────┐
  │ AI Response OK?  ├─────────▶│ Show Error / │
  └──────┬───────────┘          │ Retry Option │
         │ SUCCESS              └──────────────┘
         ▼
  ┌──────────────────┐
  │ Parse JSON       │
  │ (5 Questions)    │
  └──────┬───────────┘
         ▼
  ┌──────────────────┐
  │ Teacher Reviews  │
  │ & Edits Questions│
  └──────┬───────────┘
         ▼
  ┌──────────────────┐
  │ Publish Quiz     │
  │ (Immutable)      │
  └──────┬───────────┘
         ▼
  ┌─────────┐
  │   END   │
  └─────────┘
```

### 5.3 Face Attendance Flow

```
  ┌─────────┐
  │  START  │
  └────┬────┘
       ▼
  ┌──────────────────┐
  │ Student Enters   │
  │ 6-Digit Code     │
  └──────┬───────────┘
         ▼
  ┌──────────────────┐   INVALID   ┌──────────────┐
  │ Code Valid &     ├────────────▶│ Show Error   │
  │ Not Expired?     │             └──────────────┘
  └──────┬───────────┘
         │ VALID
         ▼
  ┌──────────────────┐
  │ Activate Webcam  │
  │ Capture Frame    │
  └──────┬───────────┘
         ▼
  ┌──────────────────┐
  │ Compute Face     │
  │ Descriptor       │
  │ (128-float vec)  │
  └──────┬───────────┘
         ▼
  ┌──────────────────┐
  │ Compare with     │
  │ Stored Descriptor│
  └──────┬───────────┘
         ▼
  ┌──────────────────┐    NO    ┌──────────────┐
  │ Match > 0.6?     ├────────▶│ Request PIN  │
  └──────┬───────────┘         │ as Backup    │
         │ YES                 └──────────────┘
         ▼
  ┌──────────────────┐
  │ Mark "Present"   │
  │ in Database      │
  └──────┬───────────┘
         ▼
  ┌──────────────────┐
  │ Update Live      │
  │ Dashboard        │
  └──────┬───────────┘
         ▼
  ┌─────────┐
  │   END   │
  └─────────┘
```

---

## 6. USE CASE DIAGRAM

```
                    ┌─────────────────────────────────────────┐
                    │          GYANDEEP SYSTEM                │
                    │                                         │
  ┌─────────┐      │  ┌─────────────────────────────────┐    │
  │         │      │  │  UC1: Login / Signup             │    │
  │ STUDENT ├─────▶│  │  UC2: Face Registration          │    │
  │         │      │  │  UC3: Join Session (6-digit code)│    │
  │         ├─────▶│  │  UC4: Attempt Quiz               │    │
  │         │      │  │  UC5: View Grades & Performance  │    │
  │         ├─────▶│  │  UC6: Submit Support Ticket      │    │
  └─────────┘      │  │  UC7: View Notifications         │    │
                    │  └─────────────────────────────────┘    │
                    │                                         │
  ┌─────────┐      │  ┌─────────────────────────────────┐    │
  │         │      │  │  UC8:  Create Session            │    │
  │ TEACHER ├─────▶│  │  UC9:  Generate AI Quiz          │    │
  │         │      │  │  UC10: Review Attendance          │    │
  │         ├─────▶│  │  UC11: Grade Students             │    │
  │         │      │  │  UC12: View Analytics             │    │
  │         ├─────▶│  │  UC13: Send Email Notifications   │    │
  └─────────┘      │  │  UC14: Manage Timetable           │    │
                    │  └─────────────────────────────────┘    │
                    │                                         │
  ┌─────────┐      │  ┌─────────────────────────────────┐    │
  │         │      │  │  UC15: Manage Users (CRUD)       │    │
  │  ADMIN  ├─────▶│  │  UC16: Bulk Import (CSV/JSON)    │    │
  │         │      │  │  UC17: View Audit Logs            │    │
  │         ├─────▶│  │  UC18: Email Health Check         │    │
  │         │      │  │  UC19: Configure Subjects/Classes │    │
  │         ├─────▶│  │  UC20: Manage Question Bank       │    │
  └─────────┘      │  └─────────────────────────────────┘    │
                    │                                         │
  ┌─────────┐      │  ┌─────────────────────────────────┐    │
  │ GEMINI  │◀─────│  │  UC21: Generate MCQs from Notes  │    │
  │   AI    │      │  │  UC22: Auto-Grade Answers         │    │
  └─────────┘      │  │  UC23: Analytics Insights         │    │
                    │  └─────────────────────────────────┘    │
                    └─────────────────────────────────────────┘
```

---

## 7. ALGORITHMS DESIGN

### 7.1 AI Quiz Generation Algorithm

```
┌─────────────────────────────────────────────────────────────┐
│  ALGORITHM: GenerateQuiz(notesText, subject)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INPUT:  notesText (string), subject (string)               │
│  OUTPUT: questions[] (5 MCQs in JSON format)                │
│                                                             │
│  STEP 1: Hash the notes text → notesHash                    │
│          ┌──────────────────────────────┐                   │
│          │ Check Redis cache for        │                   │
│          │ cached quiz (notesHash+subj) │                   │
│          └──────────┬───────────────────┘                   │
│                     │                                       │
│         CACHE HIT ──┤── CACHE MISS                          │
│              │      │        │                              │
│              ▼      │        ▼                              │
│         Return      │  STEP 2: Build AI Prompt              │
│         cached      │  ┌────────────────────────┐           │
│         quiz        │  │ "Generate exactly 5    │           │
│                     │  │  MCQs with 4 options,  │           │
│                     │  │  correct answer, and   │           │
│                     │  │  explanation for each"  │           │
│                     │  └──────────┬─────────────┘           │
│                     │             ▼                          │
│                     │  STEP 3: Call Gemini AI                │
│                     │  ┌────────────────────────┐           │
│                     │  │ gemini.generateContent  │           │
│                     │  │ (prompt + context)      │           │
│                     │  └──────────┬─────────────┘           │
│                     │             ▼                          │
│                     │  STEP 4: Parse JSON response           │
│                     │  STEP 5: Validate schema               │
│                     │  STEP 6: Cache result in Redis         │
│                     │  STEP 7: Return questions[]            │
│                                                             │
│  TIME: < 3 seconds (target SLA)                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Face Recognition Algorithm

```
┌─────────────────────────────────────────────────────────────┐
│  ALGORITHM: VerifyFace(capturedImage, studentId)            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 1: DETECT face in captured image                      │
│          ├── Find face bounding box                         │
│          └── If no face → return { match: false }           │
│                                                             │
│  STEP 2: LANDMARK 68 facial key points                      │
│          ├── Eyes, nose, mouth, jawline                     │
│          └── Used for alignment                             │
│                                                             │
│  STEP 3: ENCODE to 128-float descriptor vector              │
│          ├── Neural network extracts features               │
│          └── Result: [0.12, -0.34, 0.56, ...]              │
│                                                             │
│  STEP 4: COMPARE with stored descriptor                     │
│          ├── Load stored vector for studentId               │
│          ├── Calculate Euclidean distance:                   │
│          │                                                   │
│          │   distance = √( Σ (a[i] - b[i])² )              │
│          │                                                   │
│          └── Threshold: distance < 0.6 → MATCH             │
│                                                             │
│  STEP 5: RESULT                                             │
│          ├── Match → Mark present, update dashboard         │
│          └── No match → Request manual PIN backup           │
│                                                             │
│  TIME: < 2 seconds (target SLA)                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Session Code Algorithm

```
┌─────────────────────────────────────────────────────────────┐
│  ALGORITHM: GenerateSessionCode()                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 1: Generate random 6-digit code                       │
│          code = Math.floor(100000 + Math.random() * 900000) │
│          Example: "A3B7C9" or "482916"                      │
│                                                             │
│  STEP 2: Set expiry = current_time + 10 minutes             │
│                                                             │
│  STEP 3: Broadcast code via WebSocket to class channel      │
│                                                             │
│  STEP 4: Start countdown timer on teacher dashboard         │
│                                                             │
│  STEP 5: On expiry → auto-invalidate code                   │
│          → Save attendance snapshot to history               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.4 Engagement Scoring Algorithm

```
┌─────────────────────────────────────────────────────────────┐
│  ALGORITHM: CalculateEngagement(student)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Score = (Quiz_Score × 0.5)                                 │
│        + (Response_Speed × 0.2)                             │
│        + (Attendance_Rate × 0.3)                            │
│                                                             │
│  Where:                                                     │
│    Quiz_Score     = avg(last 5 quiz scores) / 100           │
│    Response_Speed = 1 - (avg_time / max_allowed_time)       │
│    Attendance_Rate= present_days / total_days               │
│                                                             │
│  Output: Normalized score 0–100                             │
│  Display: Progress bar + trend arrow on dashboard           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. SECURITY DESIGN

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LAYER 1: NETWORK SECURITY                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • HTTPS/SSL on all traffic                            │  │
│  │ • CORS locked to known origins                        │  │
│  │ • Rate limiting: 10 login attempts/hour               │  │
│  │ • 1000 req/min per IP                                 │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  LAYER 2: AUTHENTICATION                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • JWT tokens (8-hour expiry)                          │  │
│  │ • bcrypt password hashing (salt rounds = 12)          │  │
│  │ • Google OAuth 2.0 (optional)                         │  │
│  │ • Face biometric login (liveness detection)           │  │
│  │ • OTP for 2FA (5-minute expiry)                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  LAYER 3: AUTHORIZATION (RBAC)                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │   ADMIN ──▶ Full access (users, logs, config)         │  │
│  │              │                                         │  │
│  │   TEACHER ──▶ Create sessions, quizzes, grades        │  │
│  │              │   Cannot modify other teachers' data    │  │
│  │              │                                         │  │
│  │   STUDENT ──▶ View own data only                      │  │
│  │                Cannot access teacher/admin endpoints   │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  LAYER 4: DATA PROTECTION                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Face images: processed in-memory, deleted after 7d  │  │
│  │ • Passwords: bcrypt hashed, never stored in plain     │  │
│  │ • Input sanitization: HTML strip, length limits       │  │
│  │ • SQL injection: parameterized queries only           │  │
│  │ • XSS prevention: output encoding                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  LAYER 5: AUDIT & COMPLIANCE                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Immutable audit logs (every sensitive action)       │  │
│  │ • 90-day auto-archive to NDJSON                       │  │
│  │ • Idempotency keys prevent duplicate writes           │  │
│  │ • Version-based optimistic locking (tickets)          │  │
│  │ • GDPR: data deletion within 24 hours                │  │
│  │ • Parental consent for face data                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## SUMMARY TABLE

```
┌────────────────────┬──────────────────────────────────────────┐
│  DESIGN AREA       │  KEY DECISIONS                           │
├────────────────────┼──────────────────────────────────────────┤
│ Architecture       │ 3-tier (React + Express + SQLite/PG)     │
│ Frontend           │ React 19, Vite, Tailwind, Framer Motion  │
│ Backend            │ Node.js, Express, JWT, RBAC              │
│ Database           │ SQLite (WAL mode, single-file)            │
│ AI Engine          │ Google Gemini Pro & Flash                 │
│ Realtime           │ Server-Sent Events (SSE)                  │
│ Face ID            │ face-api.js (128-float descriptors)      │
│ Job Queue          │ BullMQ (Redis) / in-process fallback     │
│ Auth               │ JWT + bcrypt + Google OAuth + Face ID    │
│ Idempotency        │ Idempotency-Key header on all mutations  │
│ Concurrency        │ Optimistic locking (version field)       │
│ Monitoring         │ Prometheus metrics + /health endpoint    │
│ Deployment         │ Docker + GitHub Actions                   │
└────────────────────┴──────────────────────────────────────────┘
```

---

**Document Version:** 2.0
**Last Updated:** March 3, 2026
**Team:** Gyandeep Development Team
