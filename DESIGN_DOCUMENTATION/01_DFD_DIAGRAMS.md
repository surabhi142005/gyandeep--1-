# 📊 Data Flow Diagrams (DFD) - Gyandeep

## Context Level Diagram (Level 0)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GYANDEEP CONTEXT DIAGRAM                              │
│                            (Level 0 DFD)                                     │
└─────────────────────────────────────────────────────────────────────────────┘

                              👨‍🎓 STUDENT
                              
                    Data: Login Credentials
                    Quiz Responses
                    Face Recognition Data
                           │
                           ▼
    ┌──────────────────────────────────────────────────┐
    │                                                   │
    │            🕯️ GYANDEEP SYSTEM                    │
    │         Smart Classroom Platform                 │
    │                                                   │
    └──────────────────────────────────────────────────┘
                 ▲                    ▲
                 │                    │
         Analysis/Reports         Notifications
                 │                    │
        ┌────────┴────────┐  ┌───────┴────────┐
        │                 │  │                │
    👩‍🏫 TEACHER      👨‍👩‍👧 PARENT    👨‍💼 ADMIN
                                                │
                                                │
                                        ⛓️ BLOCKCHAIN
                                    (Immutable Records)
```

---

## Level 1 DFD - Main Processes

> ⚠️ **NOTICE:** Level 1 and Level 2 diagrams have been extracted into their own
> documents for easier reference:
> - [12_LEVEL1_DFD.md](12_LEVEL1_DFD.md)
> - [13_LEVEL2_DFD.md](13_LEVEL2_DFD.md)
> 
> The rest of this file will retain the original combined content for archival purposes.

## Level 1 DFD - Main Processes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LEVEL 1 DFD - GYANDEEP                               │
│                    (Major Processes & Data Stores)                           │
└─────────────────────────────────────────────────────────────────────────────┘

INPUT                          PROCESSING                        OUTPUT

👨‍🎓 STUDENT ──────────────┐
                           │
👩‍🏫 TEACHER ──────────────┼──→ ┌────────────────┐
                           │   │  1. AUTH & ID   │──→ 🔐 User DB
👨‍💼 ADMIN ──────────────┤   └────────────────┘
                           │
                           │
                           ├──→ ┌────────────────┐──→ 📚 Course DB
🤖 AI Service ────────────┼   │ 2. LEARNING &  │
                           │   │    QUIZ MGMT    │
                           │   └────────────────┘
                           │
                           ├──→ ┌────────────────┐──→ 📊 Analytics DB
                           │   │ 3. ANALYTICS &  │
                           │   │    REPORTING    │
                           │   └────────────────┘
                           │
                           ├──→ ┌────────────────┐──→ ⛓️ Blockchain
                           │   │ 4. BLOCKCHAIN   │
                           │   │    INTEGRATION  │
                           │   └────────────────┘
                           │
                           └──→ ┌────────────────┐
                               │ 5. REAL-TIME    │
                               │    SERVICES     │
                               └────────────────┘


REPORTS → Dashboards (Student/Teacher/Admin)
        → Email Notifications
        → Face Recognition Results
```

---

## Level 2 DFD - Detailed Processes

### 2.1 Authentication & Identity Management (Process 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

Student/User
    │
    ▼
┌─────────────────────┐
│1.1 Username/Password│──→ D1: User Credentials DB
│    Authentication   │
└─────────────────────┘
    │
    ├─ Success ──┐
    │            │
    │            ▼
    │   ┌──────────────────┐
    │   │1.2 Face ID Check ├──→ D2: Biometric DB
    │   │ (Liveness Check) │
    │   └──────────────────┘
    │        │
    │        ├─ Valid ──┐
    │        │          │
    │        │          ▼
    │        │   ┌──────────────────┐
    │        │   │1.3 Generate      │
    │        │   │JWT Token         │──→ Session Token
    │        │   └──────────────────┘
    │        │
    │        └─ Invalid ──→ Denial
    │
    └─ Failed ──→ Denial
```

### 2.2 Learning & Quiz Management (Process 2)

```
┌─────────────────────────────────────────────────────────────────┐
│              LEARNING & QUIZ MANAGEMENT FLOW                     │
└─────────────────────────────────────────────────────────────────┘

Teacher
    │
    ▼
┌──────────────────────┐
│2.1 Create Quiz       │─────────┐
│    Or Update Content │         │
└──────────────────────┘         │
                                 ▼
                        ┌──────────────────────┐
                        │D3: Course Content DB │
                        └──────────────────────┘

Student
    │
    ▼
┌──────────────────────┐         ┌──────────────────────┐
│2.2 Request Quiz      ├────────→│D4: Quiz Questions DB │
│    Or Study Material │         └──────────────────────┘
└──────────────────────┘
    │
    ├─ Online Mode ──┐
    │                │
    │                ▼
    │        ┌──────────────────────┐
    │        │2.3 Serve from API    │
    │        └──────────────────────┘
    │
    └─ Offline Mode ──┐
                      │
                      ▼
                ┌──────────────────────┐
                │2.4 Serve from        │
                │    LocalStorage      │
                └──────────────────────┘

Student Responses
    │
    ▼
┌──────────────────────┐         ┌──────────────────────┐
│2.5 Evaluate Response ├─────────→│D5: Responses DB      │
│    (AI or Manual)    │         └──────────────────────┘
└──────────────────────┘
    │
    ▼
    Generate Score & Feedback
```

### 2.3 Analytics & Reporting (Process 3)

```
┌─────────────────────────────────────────────────────────────────┐
│                ANALYTICS & REPORTING FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Data Sources:
├─ Student Performance Data
├─ Attendance Records
├─ Quiz Scores
├─ Real-Time Engagement Metrics
└─ Learning Twin Data

    │
    ▼
┌──────────────────────┐
│3.1 Data Aggregation  │
└──────────────────────┘
    │
    ▼
┌──────────────────────┐         ┌──────────────────────┐
│3.2 Calculate Metrics ├─────────→│D6: Analytics DB      │
│    & Insights        │         └──────────────────────┘
└──────────────────────┘
    │
    ├─────────────────┬──────────────────┬─────────────────┐
    │                 │                  │                 │
    ▼                 ▼                  ▼                 ▼
Student Dashboard  Teacher Dashboard  Admin Dashboard   Reports
(Performance)      (Class Overview)    (System Health)   (Emails/PDF)
```

### 2.4 Blockchain Integration (Process 4)

```
┌─────────────────────────────────────────────────────────────────┐
│               BLOCKCHAIN INTEGRATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Critical Records:
├─ Attendance
├─ Grades
├─ Certificates
└─ Credentials

    │
    ▼
┌──────────────────────┐
│4.1 Verify           │
│    Transaction      │
└──────────────────────┘
    │
    ├─ Valid ──┐
    │          │
    │          ▼
    │   ┌──────────────────┐
    │   │4.2 Create Record │
    │   │    Hash          │
    │   └──────────────────┘
    │          │
    │          ▼
    │   ┌──────────────────┐
    │   │4.3 Submit to     │
    │   │    Smart Contract│
    │   └──────────────────┘
    │          │
    │          ▼
    │   ┌──────────────────┐
    │   │    Store on      │──→ D7: Blockchain
    │   │    Ethereum      │   (Immutable)
    │   └──────────────────┘
    │
    └─ Invalid ──→ Reject
```

### 2.5 Real-Time Services (Process 5)

```
┌─────────────────────────────────────────────────────────────────┐
│                REAL-TIME SERVICES FLOW                           │
└─────────────────────────────────────────────────────────────────┘

Multiple Users/Devices
    │
    ▼
┌──────────────────────┐
│5.1 Central Hub       │
│    (WebSocket)       │
└──────────────────────┘
    │
    ├─→ Live Class Session
    │   │
    │   ├─ Student Camera Feed
    │   ├─ Teacher Screen Share
    │   └─ Q&A Chat
    │
    ├─→ Engagement Metrics
    │   │
    │   ├─ Attendance Alert
    │   ├─ Performance Update
    │   └─ Notifications Push
    │
    └─→ Collaborative Learning
        │
        ├─ Shared Notes
        ├─ Poll Results
        └─ Real-Time Feedback

Broadcast Results → D8: Session Activity DB
```

---

## Data Stores (D1-D8)

| ID | Name | Content |
|---|---|---|
| D1 | User Credentials DB | Username, Password Hash, 2FA Info |
| D2 | Biometric DB | Face Templates, Liveness Detection Data |
| D3 | Course Content DB | Syllabus, Notes, Study Materials |
| D4 | Quiz Questions DB | Questions, Answers, Difficulty Level |
| D5 | Responses DB | User Answers, Timestamps, Scores |
| D6 | Analytics DB | Performance Metrics, Engagement Data |
| D7 | Blockchain | Immutable Academic Records |
| D8 | Session Activity DB | Real-time Interactions, Messages |

---

## Data Flow Legend

| Symbol | Meaning |
|---|---|
| `→` | Data Flow |
| `▼` | Process Flow |
| `D#` | Data Store |
| `||` | External Entity |

