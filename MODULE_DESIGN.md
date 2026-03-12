# Gyandeep Module Design

## 1. Introduction

The Gyandeep Module Design document provides a detailed breakdown of the platform's modular architecture. Each module encapsulates specific functionality and is designed with clear boundaries, enabling independent development, testing, and maintenance. This document outlines the 10 core modules that make up the Gyandeep educational platform.

---

## 2. Module Overview

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              GYANDEEP APPLICATION                                │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  MODULE 1   │  │  MODULE 2   │  │  MODULE 3   │  │  MODULE 4   │          │
│  │AUTHENTICATION│  │  DASHBOARD  │  │    QUIZ     │  │ ATTENDANCE  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                 │                   │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐       │
│  │  MODULE 5   │  │  MODULE 6   │  │  MODULE 7   │  │  MODULE 8   │       │
│  │    GRADE    │  │  ANALYTICS  │  │     AI      │  │    FACE     │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                 │                  │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐       │
│  │  MODULE 9   │  │  MODULE 10   │                                           │
│  │UI COMPONENTS│  │   LEARNING   │                                           │
│  └──────────────┘  └──────────────┘                                           │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Details

### MODULE 1: AUTHENTICATION

**Purpose**: Handle user identity verification and access control.

| Component | Description |
|-----------|-------------|
| Login | User login interface with email/password authentication |
| useAuth | React hook for managing authentication state |
| Register | User registration form |
| PasswordReset | Password reset flow |

**Services**:
- `authService`: JWT token generation, validation, user authentication

**Features**:
- Email/password authentication
- Face-based authentication
- Google OAuth integration
- JWT token management (access + refresh)
- Role-based access control (Student, Teacher, Admin)
- Session persistence
- Account lockout after failed attempts

**Dependencies**: JWT, bcrypt, face recognition service

---

### MODULE 2: DASHBOARD

**Purpose**: Provide role-specific dashboards for different user types.

| Component | Description |
|-----------|-------------|
| StudentDashboard | Dashboard for students showing grades, attendance, quizzes |
| TeacherDashboard | Dashboard for teachers showing classes, students, analytics |
| AdminDashboard | Dashboard for admins showing system overview |
| Dashboard3D | 3D classroom visualization using React Three Fiber |
| TicketPanel | Support ticket management (role-aware) |

**Services**:
- `dataService`: Fetch and manage dashboard data
- `websocketService`: Real-time updates for dashboard metrics

**Features**:
- Role-based dashboard rendering
- Quick stats and summaries
- Recent activity feed
- Quick action buttons
- 3D classroom visualization
- Ticket management

**Dependencies**: dataService, websocketService

---

### MODULE 3: QUIZ

**Purpose**: Manage the entire quiz lifecycle including creation, distribution, and scoring.

| Component | Description |
|-----------|-------------|
| QuizView | Interface for students to take quizzes |
| QuizCreate | Interface for teachers to create quizzes |
| QuizResults | Quiz results and analytics view |
| useQuizWorker | Web worker for handling quiz logic |

**Services**:
- `quizAPI`: API endpoints for quiz CRUD operations
- `geminiService`: AI-powered quiz generation

**Features**:
- AI-powered quiz generation (Gemini)
- Multiple choice questions
- Timer-based quizzes
- Auto-scoring
- Quiz history and results
- Question bank management
- Pre/Main/Post quiz types

**Dependencies**: geminiService, quizWorker

---

### MODULE 4: ATTENDANCE

**Purpose**: Handle location-based attendance marking with geofencing and face verification.

| Component | Description |
|-----------|-------------|
| AttendanceChart | Visual representation of attendance data |
| useClassSession | Hook for managing active class sessions |
| useTeacherSession | Hook for teachers to manage their sessions |
| SessionManager | Teacher interface for starting/ending sessions |

**Services**:
- `locationService`: GPS location tracking and radius verification

**Features**:
- Location-based attendance marking (geofencing)
- Face-verified attendance
- Real-time attendance tracking
- Session-based attendance
- Attendance reports and analytics
- Teacher-controlled session start/end
- 6-digit attendance codes
- Auto-mark absent students

**Dependencies**: locationService, faceService

---

### MODULE 5: GRADE

**Purpose**: Manage student grades and performance tracking.

| Component | Description |
|-----------|-------------|
| GradeBook | Interface for viewing and managing grades |
| PerformanceChart | Visual charts showing student performance |
| usePerformance | Hook for tracking and calculating metrics |
| GradeEntry | Teacher interface for entering grades |

**Services**:
- `dataService`: CRUD operations for grades

**Features**:
- Grade entry by teachers
- Grade viewing by students
- Performance analytics
- Subject-wise grade tracking
- Grade history
- Quiz-linked grades
- Weighted grade calculation

**Dependencies**: dataService

---

### MODULE 6: ANALYTICS

**Purpose**: Provide real-time analytics and insights about student performance and engagement.

| Component | Description |
|-----------|-------------|
| RealtimeAnalytics | Real-time analytics with live updates |
| AnalyticsDashboard | Comprehensive analytics view |
| EngagementMetrics | Student engagement level metrics |
| PerformanceTrends | Historical performance trends |

**Services**:
- `websocketService`: Real-time data streaming
- `dataService`: Analytics data management

**Features**:
- Live performance tracking
- Attendance trends
- Engagement metrics
- Performance predictions
- Real-time updates via WebSocket
- Teacher insights generation

**Dependencies**: websocketService, dataService

---

### MODULE 7: AI

**Purpose**: Provide AI-powered features using Google Gemini for natural language processing.

| Component | Description |
|-----------|-------------|
| Chatbot | AI-powered chatbot for student assistance |
| AIQuizGenerator | AI-powered quiz creation |
| AIInsights | AI-generated teaching insights |

**Services**:
- `geminiService`: Google Gemini AI integration
- `voiceService`: Speech-to-text and text-to-speech

**Features**:
- AI chatbot assistance
- Quiz generation via AI
- Learning insights
- Voice commands
- Natural language queries
- Auto-grading assistance

**Dependencies**: Gemini API

---

### MODULE 8: FACE RECOGNITION

**Purpose**: Handle face detection and recognition for authentication and identification.

| Component | Description |
|-----------|-------------|
| StudentFaceRegistration | Interface for students to register their face |
| AdminFaceViewer | Interface for admins to view registered faces |
| WebcamCapture | Component for capturing face images |
| FaceLogin | Face-based login interface |

**Services**:
- `faceService`: Face detection and recognition API

**Features**:
- Face enrollment
- Face-based login
- Attendance verification
- Student identification
- Image compression and optimization
- Liveness detection

**Dependencies**: Python face service

---

### MODULE 9: UI COMPONENTS

**Purpose**: Provide a library of reusable, styled UI components.

| Component | Description |
|-----------|-------------|
| Button | Reusable button component |
| Input | Form input component |
| Card | Card container component |
| Modal | Modal dialog component |
| Badge | Status badge component |
| Spinner | Loading spinner |
| ToastNotification | Toast notifications |
| Modal | Modal dialogs |

**Services**:
- `useThemeEngine`: Theme management and styling

**Features**:
- Consistent styling with Tailwind CSS
- Reusable props interface
- Accessibility support
- Theme switching (light/dark)
- Responsive design
- Design tokens

**Dependencies**: Tailwind CSS

---

### MODULE 10: LEARNING FEATURES

**Purpose**: Provide additional educational tools and gamification.

| Component | Description |
|-----------|-------------|
| Timetable | Class schedule management |
| AnnouncementBoard | School-wide announcements |
| Leaderboard | Gamification with rankings |
| NoteManager | Centralized note management |
| DigitalClassroom | Virtual classroom environment |

**Services**:
- `dataService`: Data operations for learning features
- `geminiService`: AI insights for learning paths

**Features**:
- Timetable management
- Announcements system
- Gamification (XP, badges, coins, levels)
- Student engagement features
- Note sharing and access tracking
- Digital classroom visualization

**Dependencies**: dataService, geminiService

---

## 4. Module Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            MODULE DEPENDENCIES                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────┐                                                                   │
│  │ MODULE 1     │                                                                   │
│  │AUTHENTICATION│                                                                   │
│  └──────┬───────┘                                                                   │
│         │                                                                           │
│         ▼                                                                           │
│  ┌───────────────────────────────────────────────────────────────────────────┐      │
│  │                     ALL OTHER MODULES DEPEND ON AUTH                       │      │
│  └───────────────────────────────────────────────────────────────────────────┘      │
│         │                                                                           │
│         ├──────────────┬──────────────┬──────────────┬──────────────┐              │
│         ▼              ▼              ▼              ▼              ▼              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ MODULE 2   │  │ MODULE 3   │  │ MODULE 4   │  │ MODULE 5   │  │ MODULE 6   │   │
│  │ DASHBOARD  │  │   QUIZ     │  │ATTENDANCE  │  │   GRADE    │  │ ANALYTICS │   │
│  └─────┬──────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘   │
│        │                │                │                │                │         │
│        └────────────────┼────────────────┼────────────────┼────────────────┘         │
│                         │                │                │                          │
│                         ▼                ▼                ▼                          │
│                  ┌────────────┐   ┌────────────┐   ┌────────────┐                   │
│                  │ MODULE 7   │   │ MODULE 8   │   │ MODULE 10  │                   │
│                  │    AI      │   │    FACE    │   │  LEARNING  │                   │
│                  └────────────┘   └────────────┘   └────────────┘                   │
│                                                                                     │
│         ┌────────────────────────────────────────────────────────────────┐          │
│         │                      MODULE 9: UI COMPONENTS                   │          │
│         │            (Used by ALL modules for consistent UI)            │          │
│         └────────────────────────────────────────────────────────────────┘          │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Module-Service Mapping

| Module | Components | Services Used |
|--------|-----------|---------------|
| 1. Authentication | Login, Register, useAuth | authService |
| 2. Dashboard | StudentDashboard, TeacherDashboard, AdminDashboard | dataService, websocketService |
| 3. Quiz | QuizView, QuizCreate, useQuizWorker | quizAPI, geminiService |
| 4. Attendance | AttendanceChart, useClassSession, useTeacherSession | locationService |
| 5. Grade | GradeBook, PerformanceChart, usePerformance | dataService |
| 6. Analytics | RealtimeAnalytics, AnalyticsDashboard | websocketService, dataService |
| 7. AI | Chatbot, AIQuizGenerator | geminiService, voiceService |
| 8. Face Recognition | StudentFaceRegistration, AdminFaceViewer, WebcamCapture | faceService |
| 9. UI Components | Button, Input, Card, Modal, Badge | useThemeEngine |
| 10. Learning Features | Timetable, AnnouncementBoard, Leaderboard | dataService, geminiService |

---

## 6. Module Data Flow

### Authentication Flow
```
User Input → Login Component → authService → JWT Generation → useAuth Hook → App State
```

### Quiz Flow
```
Teacher → QuizCreate → geminiService → quizAPI → MongoDB
Student → QuizView → quizAPI → Quiz Attempt → Auto-grade → GradeBook
```

### Attendance Flow
```
Teacher → SessionManager → Create Session Code
Student → LocationService → Verify Geo → FaceService → Verify Face → dataService → Attendance Record
```

### Analytics Flow
```
Database → dataService → AnalyticsDashboard
                    ↓
            websocketService → Realtime Updates
```

---

## 7. Module Summary Table

| # | Module | Components | Services | Dependencies |
|---|--------|-----------|----------|--------------|
| 1 | Authentication | Login, Register, useAuth | authService | JWT, bcrypt |
| 2 | Dashboard | StudentDashboard, TeacherDashboard, AdminDashboard | dataService, websocketService | All modules |
| 3 | Quiz | QuizView, QuizCreate, useQuizWorker | quizAPI, geminiService | Module 1, 5, 7 |
| 4 | Attendance | AttendanceChart, useClassSession, useTeacherSession | locationService | Module 1, 8 |
| 5 | Grade | GradeBook, PerformanceChart, usePerformance | dataService | Module 3 |
| 6 | Analytics | RealtimeAnalytics, AnalyticsDashboard | websocketService, dataService | Module 2, 5 |
| 7 | AI | Chatbot, AIQuizGenerator | geminiService, voiceService | External APIs |
| 8 | Face Recognition | StudentFaceRegistration, AdminFaceViewer, WebcamCapture | faceService | External Python |
| 9 | UI Components | Button, Input, Card, Modal, Badge | useThemeEngine | None (base) |
| 10 | Learning Features | Timetable, AnnouncementBoard, Leaderboard | dataService, geminiService | Module 2, 5 |

---

## 8. Module Interface Contracts

### Auth Module Interface
```typescript
interface AuthService {
  login(email: string, password: string): Promise<User>;
  loginWithFace(imageData: string): Promise<User>;
  register(userData: UserData): Promise<User>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
  logout(token: string): Promise<void>;
}
```

### Data Service Interface
```typescript
interface DataService {
  get<T>(collection: string, query: object): Promise<T[]>;
  create<T>(collection: string, data: T): Promise<T>;
  update<T>(collection: string, id: string, data: Partial<T>): Promise<T>;
  delete(collection: string, id: string): Promise<void>;
}
```

### Location Service Interface
```typescript
interface LocationService {
  getCurrentLocation(): Promise<Coordinates>;
  verifyGeofence(point: Coordinates, center: Coordinates, radius: number): boolean;
}
```

### Gemini Service Interface
```typescript
interface GeminiService {
  generateQuiz(topic: string, gradeLevel: string, numQuestions: number): Promise<Question[]>;
  generateInsights(data: StudentData): Promise<Insight[]>;
  chat(message: string, context: string): Promise<string>;
}
```

---

## 9. Module Independence

Each module is designed to operate independently:

1. **Loose Coupling**: Modules communicate through well-defined interfaces
2. **High Cohesion**: Related functionality grouped within modules
3. **Shared Dependencies**: Only Module 1 (Auth) is a shared dependency
4. **Service Layer**: All external integrations isolated in services
5. **State Management**: Each module manages its own state via hooks
