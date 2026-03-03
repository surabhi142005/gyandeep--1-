# Level 1 Data Flow Diagram (DFD) - Gyandeep

This document isolates the Level 1 DFD, focusing on the major processes and data stores
that make up the Gyandeep system.  It’s extracted from `01_DFD_DIAGRAMS.md` to give
stakeholders a standalone reference.

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

## Process Descriptions

1. **Auth & ID** – handles registration, login, biometric verification, JWT issuance.
2. **Learning & Quiz Management** – quiz creation, serving questions, AI generation.
3. **Analytics & Reporting** – gathers performance metrics and builds dashboards.
4. **Blockchain Integration** – pushes certified records to the smart contract.
5. **Real‑time Services** – WebSocket/RTC flows for live classes, chat, and attendance.

Each process interacts with one or more persistent data stores as shown above.
