# 📦 Module Design - Gyandeep

## High-Level Module Structure

```
┌─────────────────────────────────────────────────────────────────┐
│             GYANDEEP MODULE ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────┘

GYANDEEP
│
├─ Frontend (Client)
│  ├─ Components
│  │  ├─ Auth Module
│  │  ├─ Dashboard Module
│  │  ├─ Quiz Module
│  │  ├─ Analytics Module
│  │  ├─ Classroom Module
│  │  └─ Profile Module
│  │
│  ├─ Services
│  │  ├─ API Service
│  │  ├─ WebSocket Service
│  │  ├─ Auth Service
│  │  └─ Storage Service
│  │
│  └─ Utils
│     ├─ Validators
│     ├─ Formatters
│     ├─ Constants
│     └─ Helpers
│
├─ Backend (Server)
│  ├─ Routes
│  │  ├─ Auth Routes
│  │  ├─ Quiz Routes
│  │  ├─ Analytics Routes
│  │  ├─ Attendance Routes
│  │  └─ Blockchain Routes
│  │
│  ├─ Controllers
│  │  ├─ AuthController
│  │  ├─ QuizController
│  │  ├─ AnalyticsController
│  │  ├─ AttendanceController
│  │  └─ BlockchainController
│  │
│  ├─ Services
│  │  ├─ AuthService
│  │  ├─ QuizService
│  │  ├─ AnalyticsService
│  │  ├─ NotificationService
│  │  ├─ BlockchainService
│  │  └─ AIIntegrationService
│  │
│  ├─ Models
│  │  ├─ User Model
│  │  ├─ Quiz Model
│  │  ├─ Response Model
│  │  ├─ Attendance Model
│  │  ├─ Grade Model
│  │  └─ Analytics Model
│  │
│  ├─ Middleware
│  │  ├─ Authentication Middleware
│  │  ├─ Authorization Middleware
│  │  ├─ Error Handler
│  │  ├─ Request Logger
│  │  ├─ Rate Limiter
│  │  └─ CORS Handler
│  │
│  ├─ Utils
│  │  ├─ Database Helpers
│  │  ├─ Encryption Utilities
│  │  ├─ Email Utilities
│  │  ├─ Validation Helpers
│  │  └─ Constants
│  │
│  ├─ Config
│  │  ├─ Database Config
│  │  ├─ Cache Config
│  │  ├─ Blockchain Config
│  │  ├─ AI API Config
│  │  └─ Email Config
│  │
│  └─ Database
│     ├─ Migrations
│     ├─ Seeds
│     └─ Transactions
│
└─ Shared
   ├─ Types/Interfaces
   ├─ Constants
   ├─ Enums
   └─ DTOs (Data Transfer Objects)
```

---

## Module 1: Authentication & Identity Management

```
┌──────────────────────────────────────────────────────────────┐
│        AUTH & IDENTITY MANAGEMENT MODULE                    │
└──────────────────────────────────────────────────────────────┘

┌─ Frontend Components
│  ├─ LoginComponent
│  │  ├─ Email/Password Input
│  │  ├─ Face Recognition Trigger
│  │  └─ 2FA Verification
│  │
│  ├─ RegisterComponent
│  │  ├─ User Details Form
│  │  ├─ Face Enrollment
│  │  └─ Email Verification
│  │
│  ├─ FaceAuthComponent
│  │  ├─ WebcamCapture
│  │  ├─ LivenessDetection
│  │  └─ Feedback Display
│  │
│  └─ PasswordRecoveryComponent
│     ├─ Email Verification
│     ├─ OTP Validation
│     └─ Password Reset Form
│
├─ Backend Services
│  ├─ AuthService
│  │  ├─ User Registration
│  │  │  ├─ Validate Input
│  │  │  ├─ Check Existing User
│  │  │  ├─ Hash Password
│  │  │  ├─ Create User Record
│  │  │  ├─ Send Verification Email
│  │  │  └─ Generate JWT
│  │  │
│  │  ├─ Login
│  │  │  ├─ Verify Email/Username
│  │  │  ├─ Validate Password
│  │  │  ├─ Trigger Face Recognition
│  │  │  ├─ Check 2FA Status
│  │  │  └─ Generate JWT Token
│  │  │
│  │  ├─ Face Recognition
│  │  │  ├─ Capture Face Image
│  │  │  ├─ Perform Liveness Detection
│  │  │  ├─ Extract Face Embeddings
│  │  │  ├─ Compare with Stored Template
│  │  │  ├─ Log Biometric Event
│  │  │  └─ Update Last Login
│  │  │
│  │  ├─ Token Management
│  │  │  ├─ Generate JWT (Access + Refresh)
│  │  │  ├─ Validate Token
│  │  │  ├─ Refresh Token
│  │  │  ├─ Revoke Token
│  │  │  └─ Token Blacklisting
│  │  │
│  │  └─ 2FA/MFA
│  │     ├─ Generate OTP
│  │     ├─ Send OTP (Email/SMS)
│  │     ├─ Validate OTP
│  │     ├─ Configure Authenticator
│  │     └─ Backup Codes
│  │
│  ├─ BiometricService
│  │  ├─ Face Enrollment
│  │  │  ├─ Capture Multiple Images
│  │  │  ├─ Extract Features
│  │  │  ├─ Create Template
│  │  │  └─ Store in Biometric DB
│  │  │
│  │  ├─ Face Recognition
│  │  │  ├─ Capture Live Image
│  │  │  ├─ Detect Face
│  │  │  ├─ Liveness Check
│  │  │  ├─ Generate Embedding
│  │  │  ├─ Compare with Templates
│  │  │  └─ Return Confidence Score
│  │  │
│  │  └─ Liveness Detection
│  │     ├─ Detect Eye Blink
│  │     ├─ Detect Head Movement
│  │     ├─ Detect Micro-expressions
│  │     └─ Anti-spoofing Algorithm
│  │
│  └─ EncryptionService
│     ├─ Password Hashing (bcrypt)
│     ├─ Encryption/Decryption
│     ├─ Token Signing
│     └─ Data Encryption at Rest
│
├─ API Endpoints
│  ├─ POST /api/auth/register
│  ├─ POST /api/auth/login
│  ├─ POST /api/auth/face-enrollment
│  ├─ POST /api/auth/face-login
│  ├─ POST /api/auth/verify-2fa
│  ├─ POST /api/auth/refresh-token
│  ├─ GET /api/auth/logout
│  ├─ POST /api/auth/password-reset
│  └─ POST /api/auth/verify-email
│
├─ Database Tables
│  ├─ users
│  ├─ biometric_data
│  ├─ sessions
│  ├─ password_reset_tokens
│  ├─ audit_logs
│  └─ failed_login_attempts
│
└─ Security Features
   ├─ Password Complexity Requirements
   ├─ Rate Limiting on Login
   ├─ Session Timeout
   ├─ CORS Protection
   ├─ CSRF Protection
   └─ Audit Logging
```

---

## Module 2: Learning & Quiz Management

```
┌──────────────────────────────────────────────────────────────┐
│        LEARNING & QUIZ MANAGEMENT MODULE                    │
└──────────────────────────────────────────────────────────────┘

┌─ Frontend Components
│  ├─ CourseListComponent
│  ├─ CourseDetailComponent
│  ├─ QuizComponent
│  │  ├─ Question Display
│  │  ├─ Answer Selection
│  │  ├─ Timer Display
│  │  └─ Progress Bar
│  ├─ QuizResultComponent
│  └─ StudyMaterialComponent
│
├─ Backend Services
│  ├─ CourseService
│  │  ├─ Get All Courses
│  │  ├─ Get Course with Materials
│  │  ├─ Search Courses
│  │  ├─ Enroll Student
│  │  └─ Get Enrolled Courses
│  │
│  ├─ QuizService
│  │  ├─ Create Quiz
│  │  │  ├─ Validate Input
│  │  │  ├─ Set Duration
│  │  │  ├─ Add Questions
│  │  │  ├─ Set Difficulty
│  │  │  └─ Save to Database
│  │  │
│  │  ├─ Get Quiz
│  │  │  ├─ Check Access
│  │  │  ├─ Randomize Questions
│  │  │  ├─ Obfuscate Answers
│  │  │  └─ Return Quiz
│  │  │
│  │  ├─ AI-Powered Quiz Generation
│  │  │  ├─ Parse Study Notes
│  │  │  ├─ Extract Key Concepts
│  │  │  ├─ Call Gemini API
│  │  │  ├─ Generate Questions
│  │  │  ├─ Validate Question Quality
│  │  │  ├─ Save Generated Quiz
│  │  │  └─ Return to User
│  │  │
│  │  ├─ Submit Quiz Response
│  │  │  ├─ Validate Submission
│  │  │  ├─ Check Time Limit
│  │  │  ├─ Store Responses
│  │  │  ├─ Calculate Score
│  │  │  ├─ Generate Feedback
│  │  │  ├─ Update Analytics
│  │  │  └─ Return Score
│  │  │
│  │  └─ Evaluate Quiz
│  │     ├─ MCQ Evaluation (Auto)
│  │     ├─ Short Answer (Use NLP)
│  │     ├─ Subjective (Manual/AI)
│  │     ├─ Award Marks
│  │     └─ Generate Feedback
│  │
│  ├─ ContentService
│  │  ├─ Upload Study Material
│  │  ├─ Parse PDF/Notes
│  │  ├─ Extract Text
│  │  ├─ Organize by Topic
│  │  ├─ Search Content
│  │  └─ Delete Content
│  │
│  ├─ OfflineService
│  │  ├─ Sync Data to LocalStorage
│  │  ├─ Detect Online/Offline
│  │  ├─ Queue Submission
│  │  ├─ Sync on Connection
│  │  └─ Conflict Resolution
│  │
│  └─ AIIntegrationService
│     ├─ Call Gemini API
│     ├─ Parse Response
│     ├─ Generate Explanations
│     ├─ Handle API Errors
│     └─ Cache Results
│
├─ API Endpoints
│  ├─ GET /api/courses
│  ├─ GET /api/courses/:id
│  ├─ POST /api/courses/enroll
│  ├─ GET /api/quizzes/:id
│  ├─ POST /api/quizzes/submit
│  ├─ POST /api/quizzes/generate-ai
│  ├─ GET /api/materials/:courseId
│  ├─ POST /api/materials/upload
│  └─ GET /api/results/:quizId
│
├─ Database Tables
│  ├─ courses
│  ├─ study_materials
│  ├─ quizzes
│  ├─ quiz_questions
│  ├─ quiz_answers
│  ├─ student_responses
│  └─ quiz_results
│
└─ Features
   ├─ Offline Quiz Attempt
   ├─ Auto-Save Progress
   ├─ Timer Countdown
   ├─ Shuffle Questions & Answers
   ├─ Analytics Update
   └─ Certificate Generation
```

---

## Module 3: Attendance & Classroom Management

```
┌──────────────────────────────────────────────────────────────┐
│     ATTENDANCE & CLASSROOM MANAGEMENT MODULE                │
└──────────────────────────────────────────────────────────────┘

┌─ Frontend Components
│  ├─ AttendanceCheckComponent
│  ├─ AttendanceReportComponent
│  ├─ ClassroomComponent
│  │  ├─ Video Feed
│  │  ├─ Screen Share
│  │  ├─ Chat Interface
│  │  └─ Attendance List
│  └─ TimetableComponent
│
├─ Backend Services
│  ├─ AttendanceService
│  │  ├─ Mark Attendance
│  │  │  ├─ Verify Face Recognition
│  │  │  ├─ Check Session Status
│  │  │  ├─ Record Check-in
│  │  │  ├─ Broadcast Event
│  │  │  ├─ Log to Database
│  │  │  └─ Notify Parent (optional)
│  │  │
│  │  ├─ Get Attendance Report
│  │  │  ├─ Filter by Date Range
│  │  │  ├─ Calculate Present %
│  │  │  ├─ Identify Absentees
│  │  │  ├─ Generate Report
│  │  │  └─ Export to PDF/CSV
│  │  │
│  │  ├─ Generate Certificate
│  │  │  ├─ Calculate Attendance %
│  │  │  ├─ Check Eligibility
│  │  │  ├─ Create Document
│  │  │  ├─ Digitally Sign (optional)
│  │  │  └─ Store on Blockchain
│  │  │
│  │  └─ Attendance Analytics
│  │     ├─ Trend Analysis
│  │     ├─ Identify Patterns
│  │     ├─ Predict At-Risk Students
│  │     └─ Generate Alerts
│  │
│  ├─ ClassroomService
│  │  ├─ Create Class Session
│  │  │  ├─ Set Date/Time
│  │  │  ├─ Set Duration
│  │  │  ├─ Add Topics
│  │  │  └─ Send Invitations
│  │  │
│  │  ├─ Start Class
│  │  │  ├─ Initialize WebRTC
│  │  │  ├─ Open WebSocket Connection
│  │  │  ├─ Broadcast Session Start
│  │  │  ├─ Enable Screen Share
│  │  │  └─ Record Session (optional)
│  │  │
│  │  ├─ Real-time Interactions
│  │  │  ├─ Live Chat
│  │  │  ├─ Q&A Session
│  │  │  ├─ Poll/Quiz
│  │  │  ├─ Hand Raise
│  │  │  └─ Breakout Rooms
│  │  │
│  │  ├─ End Class
│  │  │  ├─ Save Session Data
│  │  │  ├─ Generate Session Report
│  │  │  ├─ Send Recording
│  │  │  ├─ Rate Session
│  │  │  └─ Update Analytics
│  │  │
│  │  └─ Timetable Management
│  │     ├─ Create Schedule
│  │     ├─ Assign Teacher/Room
│  │     ├─ Send Reminders
│  │     └─ Manage Conflicts
│  │
│  └─ WebSocketService (Real-time)
│     ├─ Broadcast Attendance
│     ├─ Stream Video/Audio
│     ├─ Relay Chat Messages
│     ├─ Sync Participants
│     └─ Handle Disconnections
│
├─ API Endpoints
│  ├─ POST /api/attendance/mark
│  ├─ GET /api/attendance/report
│  ├─ GET /api/attendance/analytics
│  ├─ POST /api/classroom/create
│  ├─ POST /api/classroom/start/:id
│  ├─ GET /api/classroom/join/:id
│  ├─ POST /api/classroom/end/:id
│  └─ GET /api/timetable
│
├─ Database Tables
│  ├─ attendance_records
│  ├─ classroom_sessions
│  ├─ session_participants
│  ├─ classroom_messages
│  ├─ timetable
│  └─ session_recordings
│
└─ WebSocket Events
   ├─ attendance:marked
   ├─ class:started
   ├─ class:ended
   ├─ message:sent
   ├─ user:joined
   ├─ user:left
   └─ screen:shared
```

---

## Module 4: Grading & Performance Analytics

```
┌──────────────────────────────────────────────────────────────┐
│      GRADING & PERFORMANCE ANALYTICS MODULE                 │
└──────────────────────────────────────────────────────────────┘

┌─ Frontend Components
│  ├─ GradeBookComponent
│  ├─ PerformanceChartComponent
│  ├─ AnalyticsDashboardComponent
│  └─ ReportCardComponent
│
├─ Backend Services
│  ├─ GradingService
│  │  ├─ Calculate Quiz Score
│  │  ├─ Generate Report Card
│  │  ├─ Calculate Overall GPA
│  │  ├─ Assign Letter Grade
│  │  ├─ Blockchain Record
│  │  └─ Send to Parent
│  │
│  ├─ AnalyticsService
│  │  ├─ Calculate Engagement Score
│  │  ├─ Learning Pattern Analysis
│  │  │  ├─ Time Spent Learning
│  │  │  ├─ Quiz Accuracy Trend
│  │  │  ├─ Topic Mastery Level
│  │  │  └─ Performance Growth
│  │  │
│  │  ├─ Predictive Analytics
│  │  │  ├─ Identify At-Risk Students
│  │  │  ├─ Predict Final Grade
│  │  │  ├─ Recommend Focus Areas
│  │  │  └─ Suggest Interventions
│  │  │
│  │  ├─ Class Analytics
│  │  │  ├─ Average Performance
│  │  │  ├─ Class Distribution
│  │  │  ├─ Top Performers
│  │  │  ├─ Struggling Students
│  │  │  └─ Class Trends
│  │  │
│  │  └─ Learning Twin
│  │     ├─ AI Persona Initialization
│  │     ├─ Track Student Profile
│  │     ├─ Generate Recommendations
│  │     ├─ Adapt Learning Path
│  │     └─ Provide Personalized Content
│  │
│  └─ ReportService
│     ├─ Generate Report Card PDF
│     ├─ Compile Performance Metrics
│     ├─ Include Feedback
│     ├─ Digital Signature
│     └─ Archive Report
│
├─ API Endpoints
│  ├─ GET /api/grades/:studentId
│  ├─ GET /api/analytics/student/:id
│  ├─ GET /api/analytics/class/:classId
│  ├─ GET /api/learning-twin/:studentId
│  ├─ GET /api/reports/performance
│  ├─ GET /api/reports/predict-grade
│  └─ POST /api/reports/generate-pdf
│
├─ Database Tables
│  ├─ grades
│  ├─ analytics_metrics
│  ├─ learning_twin_profile
│  ├─ student_recommendations
│  └─ report_cards
│
└─ Machine Learning Models
   ├─ Performance Prediction
   ├─ Anomaly Detection
   ├─ Learning Path Recommendation
   └─ Engagement Scoring
```

---

## Module 5: Blockchain Integration

```
┌──────────────────────────────────────────────────────────────┐
│         BLOCKCHAIN INTEGRATION MODULE                        │
└──────────────────────────────────────────────────────────────┘

┌─ Smart Contracts
│  ├─ AcademicCredentials.sol
│  │  ├─ Issue Credential
│  │  ├─ Verify Credential
│  │  ├─ Revoke Credential
│  │  └─ Query History
│  │
│  ├─ AttendanceRecord.sol
│  │  ├─ Record Attendance
│  │  ├─ Query Attendance
│  │  ├─ Generate Certificate
│  │  └─ Event Logging
│  │
│  └─ GradingSystem.sol
│     ├─ Submit Grade
│     ├─ Query Grade
│     ├─ Grade History
│     └─ Tamper Detection
│
├─ Backend Services
│  ├─ BlockchainService
│  │  ├─ Initialize Web3 Connection
│  │  ├─ Deploy Smart Contracts
│  │  ├─ Submit Transaction
│  │  ├─ Track Transaction Status
│  │  ├─ Handle Gas Fees
│  │  ├─ Error Handling
│  │  ├─ Event Listening
│  │  └─ Query State
│  │
│  ├─ WalletService
│  │  ├─ Create Wallet
│  │  ├─ Import Wallet
│  │  ├─ Manage Private Keys
│  │  ├─ Check Balance
│  │  └─ Transfer Tokens
│  │
│  └─ TransactionService
│     ├─ Submit Attendance to Blockchain
│     ├─ Submit Grade to Blockchain
│     ├─ Search Transaction History
│     ├─ Verify Immutability
│     └─ Generate Proof
│
├─ API Endpoints
│  ├─ POST /api/blockchain/submit-attendance
│  ├─ POST /api/blockchain/submit-grade
│  ├─ GET /api/blockchain/verify-credential
│  ├─ GET /api/blockchain/transaction-history
│  ├─ POST /api/wallet/create
│  ├─ GET /api/wallet/balance
│  └─ POST /api/blockchain/deploy-contract
│
├─ Database Tables
│  ├─ blockchain_transactions
│  ├─ blockchain_events
│  ├─ wallet_management
│  └─ credential_registry
│
└─ Security
   ├─ Private Key Encryption
   ├─ Transaction Signing
   ├─ Access Control
   ├─ Audit Logging
   └─ Gas Limit Protection
```

---

## Module 6: Notification & Communication

```
┌──────────────────────────────────────────────────────────────┐
│      NOTIFICATION & COMMUNICATION MODULE                    │
└──────────────────────────────────────────────────────────────┘

├─ Notification Service
│  ├─ Email Notifications
│  │  ├─ Registration Confirmation
│  │  ├─ Quiz Results
│  │  ├─ Attendance Summary
│  │  ├─ Progress Reports
│  │  └─ Alerts
│  │
│  ├─ In-App Notifications
│  │  ├─ Toast Messages
│  │  ├─ Push Notifications
│  │  ├─ Notification Center
│  │  └─ Read/Unread Status
│  │
│  ├─ SMS Notifications
│  │  ├─ OTP
│  │  ├─ Urgent Alerts
│  │  └─ Attendance Reminder
│  │
│  └─ Notification Preferences
│     ├─ Frequency Settings
│     ├─ Channel Selection
│     ├─ Quiet Hours
│     └─ Opt-in/Opt-out
│
├─ Chat & Messaging
│  ├─ 1-to-1 Chat
│  ├─ Group Chat
│  ├─ File Sharing
│  ├─ Message Search
│  └─ Chat History
│
├─ API Endpoints
│  ├─ POST /api/notifications/send-email
│  ├─ POST /api/notifications/push
│  ├─ GET /api/notifications
│  ├─ POST /api/notifications/read
│  ├─ POST /api/chat/send-message
│  ├─ GET /api/chat/:conversationId
│  └─ POST /api/chat/preferences
│
└─ Database Tables
   ├─ notifications
   ├─ email_queue
   ├─ chat_messages
   ├─ conversations
   └─ notification_preferences
```

---

## Module Dependencies

```
         ┌─────────────────────────────────┐
         │  Core Module (Configuration)    │
         └────────────┬────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
    ┌────────┐  ┌──────────┐  ┌─────────────┐
    │ Auth   │  │ Quiz &   │  │ Attendance  │
    │ Module │  │ Learning │  │ Module      │
    └────┬───┘  └────┬─────┘  └──────┬──────┘
         │           │               │
         └───────────┼───────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │ Analytics & Grading     │
         │ Module                  │
         └────────┬────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
       ┌──┐  ┌─────────┐  ┌──────────┐
       │N │  │Blockchain  │Notification│
       │o │  │Integration │Module      │
       │t │  └─────────────┘           │
       │i │                            │
       │f │  ┌──────────────────────────┘
       │i │  │
       │c │  │
       │a │  │
       │t │  │
       │i │  │
       │o │
       │n │
       └──┘
```

