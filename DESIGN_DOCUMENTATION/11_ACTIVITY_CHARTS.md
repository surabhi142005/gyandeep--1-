# 🔄 Activity Charts & Flows - Gyandeep

This document focuses solely on activity diagrams and related flows. It is extracted from
`05_USE_CASES_ACTIVITY_CHARTS.md` to allow developers and designers to review procedural
workflows independently of use case specifications.

---

## Activity Diagrams

### Activity 1: Quiz Creation & Publishing Flow

```
┌──────────────────────────────────────────────────────────────────┐
│          ACTIVITY: QUIZ CREATION & PUBLISHING FLOW                │
└──────────────────────────────────────────────────────────────────┘

Start
  │
  ▼
┌─────────────┐
│ Teacher     │
│ Creates New │
│ Quiz        │
└────┬────────┘
     │
     ▼
┌──────────────────┐
│ Enter Quiz       │
│ - Title          │
│ - Description    │
│ - Duration       │
│ - Total Marks    │
└────┬─────────────┘
     │
     ▼
    / \\  ─ Or/Else Fork ──┐
   /   \\                 │
  /     \\                │
 /       \\               │
(Manual  (AI          ┌───▼────────┐
 Creation  Generation)│ AI Auto-Gen│
  │          │         │using Notes │
  │          │         └───┬────────┘
  │          │             │
  ▼          ▼             ▼
┌──────────┐ ┌──────────────────────┐
│ Enter    │ │ Call Gemini API      │
│ Questions│ │ - Parse content      │
│ Manually │ │ - Generate questions │
└────┬─────┘ │ - Validate quality   │
     │       └────┬─────────────────┘
     │            │
     │            ▼
     │       ┌────────────────┐
     │       │ Review & Edit  │
     │       │ AI Questions   │
     │       └────┬───────────┘
     │            │
     └────────┬───┘
              │
              ▼
         ┌─────────────┐
         │ Add Answer  │
         │ Options     │
         │ & Explain   │
         └────┬────────┘
              │
              ▼
          ┌────────────────┐
          │ Set Pass Marks,│
          │ Difficulty,    │
          │ Neg. Marking   │
          └────┬───────────┘
               │
               ▼
           ┌──────────────┐
           │ Preview Quiz │
           └────┬─────────┘
                │
               / \\  ─ Decision ──┐
              /   \\              │
             / OK? \\             │
            /       \\            │
           /         \\           │
          / Yes ┐    No\\         │
         /      │ (Edit)│        │
        /       │       ▼        │
       /        │   (Go Back)    │
      /         │       │        │
     /          └───────┘        │
    │                            │
    ▼                            │
┌─────────────────────┐          │
│ Schedule Quiz       │◄─────────┘
│ - Start Date/Time   │
│ - End Date/Time     │
│ - Available to      │
│   which classes     │
└──────┬──────────────┘
       │
       ▼
   ┌──────────────┐
   │ Review All   │
   │ Settings     │
   └──────┬───────┘
          │
         / \\  ─ Decision ──┐
        /   \\              │
       / OK? \\             │
      /       \\            │
     / Yes ┐  No\\          │
    /      │(Edit│         │
   /       │     ▼         │
  /        │  (Go Back)    │
 /         │      │        │
/          └──────┘        │
│                          │
▼                          │
┌──────────────────────────┴──┐
│ PUBLISH QUIZ               │
│ - Set is_published = TRUE  │
│ - Save to database         │
│ - Notify students          │
│ - Create quiz session      │
└──────┬─────────────────────┘
       │
       ▼
  ┌─────────────┐
  │ Send Email  │
  │ Notification│
  │ to class    │
  └──────┬──────┘
         │
         ▼
    ┌──────────────┐
    │ Log Activity:│
    │ - Quiz ID    │
    │ - Timestamp  │
    │ - Teacher ID │
    └──────┬───────┘
           │
           ▼
        [End]
```

### Activity 2: Real-Time Classroom Session

```
┌──────────────────────────────────────────────────────────────────┐
│         ACTIVITY: REAL-TIME CLASSROOM SESSION MANAGEMENT          │
└──────────────────────────────────────────────────────────────────┘

[Start Class Session]
         │
         ▼
┌──────────────────────┐
│ Teacher Initiates    │
│ Class Session        │
│ - Set Topic          │
│ - Configure Settings │
└──────────┬───────────┘
           │
           ▼
    ┌────────────────┐
    │ WebRTC Setup   │
    │ - Initialize   │
    │   connection   │
    └────────┬───────┘
             │
             ▼
      ┌──────────────┐
      │ WebSocket    │
      │ Connection   │
      └──────┬───────┘
             │
         ┌───┴─────────────────────────┐
         │                             │
         ▼                             ▼
    ┌──────────┐              ┌────────────────┐
    │ Teacher  │              │ Student Port   │
    │ Joins    │              │ (Accepts)      │
    │ Session  │              └────────┬───────┘
    └──────┬───┘                       │
           │                           ▼
           │                     ┌─────────────┐
           │                     │ Mark        │
           │                     │ Attendance  │
           │                     └──────┬──────┘
           │                            │
           ▼                            ▼
    ┌─────────────────┐          ┌──────────────┐
    │ Broadcast       │          │ Join Video   │
    │ "Class Started" │          │ Conference   │
    │ Event           │          └──────┬───────┘
    └────────┬────────┘                 │
             │                          │
             │◄─────────────────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ Parallel Activities  │
    │ (Concurrent)         │
    └─────┬────────────────┘
          │
    ┌─────┴──────────────┬──────────┬─────────────┐
    │                    │          │             │
    ▼                    ▼          ▼             ▼
 ┌───────┐        ┌────────┐   ┌─────────┐   ┌──────┐
 │Screen │        │Chat    │   │Attendance│   │Polls │
 │Share  │        │Messages│   │Live      │   │Quiz  │
 │       │        │(H2H,   │   │Update    │   │      │
 │-Teacher        │ Group) │   │-System   │   │      │
 │ shares         │        │   │ broadcast│   │      │
 │ screen         │        │   │ events   │   │      │
 │-Students       │        │   │-Students │   │      │
 │ view content   │        │   │ check in  │   │      │
 │       │        │        │   │       │   │      │
 └───────┘        └────────┘   └─────────┘   └──────┘
    │                │           │             │
    │                │           │             │
    └────────┬───────┴───────────┴─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ Engagement Tracking  │
    │ - Questions asked    │
    │ - Participation      │
    │ - Activity score     │
    │ - Update analytics   │
    └──────────┬───────────┘
               │
               │◄─── Duration expires or
               │     Teacher ends class
               │
               ▼
    ┌──────────────────────┐
    │ Session Ending       │
    │ Procedure            │
    └──────────┬───────────┘
               │
         ┌─────┴─────┐
         │           │
         ▼           ▼
    ┌────────┐  ┌─────────────┐
    │Save    │  │Stop Video   │
    │Session │  │Recording    │
    │Data    │  │             │
    └────┬───┘  └──────┬──────┘
         │             │
         │◄────────────┘
         │
         ▼
    ┌──────────────┐
    │Generate      │
    │Session       │
    │Summary       │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────┐
    │Send Reports/     │
    │Notifications to: │
    │- Students        │
    │- Teachers        │
    │- Parents         │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │Close WebRTC      │
    │& WebSocket       │
    │Connections       │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │Log Session       │
    │Metrics:          │
    │- Duration        │
    │- Participants    │
    │- Attendance      │
    │- Engagement      │
    └──────┬───────────┘
           │
           ▼
        [End]
```

---

## Sequence Diagram: Quiz Submission & Evaluation

```
┌──────────────────────────────────────────────────────────────────┐
│    SEQUENCE: QUIZ SUBMISSION & AI EVALUATION FLOW                 │
└──────────────────────────────────────────────────────────────────┘

Student          QuizComponent    Backend API    EvaluationEngine   Gemini API
   │                   │              │              │               │
   │ 1. Submit Quiz    │              │              │               │
   ├──────────────────►│              │              │               │
   │                   │              │              │               │
   │                   │ 2. Validate  │              │               │
   │                   ├─────────────►│              │               │
   │                   │              │              │               │
   │                   │ 3. Store     │              │               │
   │                   │    Responses │              │               │
   │                   │◄─────────────┤              │               │
   │                   │              │              │               │
   │                   │              │ 4. Evaluate │               │
   │                   │              │    Questions├──────────────► │
   │                   │              │             │                │
   │                   │              │             │  5. Parse &   │
   │                   │              │             │     Generate  │
   │                   │              │             │     Feedback  │
   │                   │              │             │◄───────────────┤
   │                   │              │             │                │
   │                   │              │  6. Store  │                │
   │                   │              │     Results├────────────────►│
   │                   │              │◄────────────┤                │
   │                   │              │             │                │
   │                   │ 7. Return    │             │                │
   │                   │    Score &   │             │                │
   │                   │    Feedback  │             │                │
   │                   │◄─────────────┤             │                │
   │                   │              │             │                │
   │ 8. Display        │              │             │                │
   │    Results        │              │             │                │
   │◄──────────────────┤              │             │                │
   │                   │              │             │                │
   │ 9. Save to        │              │             │                │
   │    Cache          │              │             │                │
   ├──────────────────►│              │             │                │
   │                   │              │             │                │
   │                   │ 10. Update   │             │                │
   │                   │     Analytics│             │                │
   │                   ├─────────────►│             │                │
   │                   │              │             │                │
   │ 11. Trigger       │              │             │                │
   │     Notification  │              │             │                │
   │     Service       │              │             │                │
   ├──────────────────►│              │             │                │
   │                   │              │             │                │
   │                   └              └             └                └
```

---

## Data Flow: Blockchain Integration

```
┌──────────────────────────────────────────────────────────────────┐
│       ACTIVITY: BLOCKCHAIN RECORD ARCHIVAL PROCESS                │
└──────────────────────────────────────────────────────────────────┘

Start - Ready to Archive Records
         │
         ▼
   ┌─────────────────────┐
   │ Collect Records:    │
   │ - Attendance Data   │
   │ - Grades            │
   │ - Certificates      │
   └──────────┬──────────┘
              │
              ▼
         ┌────────────────┐
         │ Generate Hash: │
         │ - MD5/SHA256   │
         │ - Immutable ID │
         └───────┬────────┘
                 │
                 ▼
             ┌─────────────────┐
             │ Create JSON:    │
             │ - Student ID    │
             │ - Record data   │
             │ - Timestamp     │
             │ - Hash          │
             └────────┬────────┘
                      │
                      ▼
              ┌─────────────────┐
              │ Connect to Web3 │
              │ Provider        │
              └────────┬────────┘
                       │
                       ▼
              ┌──────────────────────┐
              │ Estimate Gas Fee     │
              │ - Base Fee           │
              │ - Priority Fee       │
              └────────┬─────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
        Gas Too │                  │ Gas OK
        High?  │                  │
           ▼                      ▼
        ┌───────┐            ┌──────────────┐
        │ Queue │            │ Submit       │
        │ Later │            │ Transaction  │
        └───────┘            │ to Network   │
           │                 └──────┬───────┘
           │                        │
           │                        ▼
           │                 ┌──────────────┐
           │                 │ Monitor      │
           │                 │ Gas Price    │
           │                 └──────┬───────┘
           │                        │
           │                    WaitTime
           │                        │
           │                        ▼
           │                  ┌──────────────┐
           │                  │ Transaction  │
           │                  │ Pending      │
           │                  │ - Calculate  │
           │                  │   blocks     │
           │                  └──────┬───────┘
           │                         │
           │                    Confirmations
           │                    > Threshold?
           │                         │
           │                    ┌────┴────┐
           │                    │ Yes  No │
           │                    ▼         │
           │               ┌────────┐    │
           └──────────────►│ Failed │    │
                           │ Retry  │    │
                           └────────┘    │
                               │         │
                               └────┬────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │ Transaction     │
                          │ Confirmed!      │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ Extract Tx Hash: │
                          │ - Block Number   │
                          │ - Tx Index       │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ Store in         │
                          │ Database:        │
                          │ - Tx Hash        │
                          │ - Block #        │
                          │ - Status         │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ Generate         │
                          │ Verification     │
                          │ URL/QR Code      │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ Send Notification│
                          │ to Student       │
                          │ - Certificate    │
                          │ - Verification   │
                          │ - QR Code        │
                          └────────┬─────────┘
                                   │
