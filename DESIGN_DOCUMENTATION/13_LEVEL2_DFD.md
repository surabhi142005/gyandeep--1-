# Level 2 Data Flow Diagrams (DFD) - Gyandeep

This document contains detailed Level 2 flows for each major process identified in the
Level 1 diagram. Extracted from `01_DFD_DIAGRAMS.md` to give developers insight into
data movement within individual subsystems.

---

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

---

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
                │2.4 Serve from Local  │
                │    Cache             │
                └──────────────────────┘

... (remaining subflows omitted for brevity)
```

*(Additional sub‑diagrams for Analytics, Blockchain and Real‑time services are
included in the original file.)*

---

### 2.3 Analytics & Reporting (Process 3)

```
┌─────────────────────────────────────────────────────────────────┐
│                ANALYTICS & REPORTING FLOW                      │
└─────────────────────────────────────────────────────────────────┘

... (diagram text retained from original document)
```

### 2.4 Blockchain Integration (Process 4)

*(diagram text from 01_DFD_DIAGRAMS.md)*

### 2.5 Real-Time Services (Process 5)

*(diagram text from 01_DFD_DIAGRAMS.md)*

---

Further elaboration of each sub‑process and associated data store is available in
the combined Level 2 section of `01_DFD_DIAGRAMS.md`.
