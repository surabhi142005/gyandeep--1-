# 👥 Use Case Diagrams & Activity Charts - Gyandeep

> ⚠️ **NOTE:** This document originally contained both use case diagrams and activity
> charts. The content has now been **split** into two separate files for clarity:
> - [10_USE_CASE_DIAGRAMS.md](10_USE_CASE_DIAGRAMS.md) – use cases only
> - [11_ACTIVITY_CHARTS.md](11_ACTIVITY_CHARTS.md) – activity diagrams and flows
>
> The remaining material below is retained for historical reference and may be
> deprecated in future revisions.


## High-Level Use Case Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    GYANDEEP SYSTEM USE CASES                              │
└──────────────────────────────────────────────────────────────────────────┘

                                  GYANDEEP SYSTEM
                                       │
                ┌──────────────────────┼──────────────────────┐
                │                      │                      │
        ┌───────▼───────┐      ┌───────▼───────┐     ┌────────▼──────┐
        │              │      │              │     │              │
        │   STUDENT    │      │   TEACHER    │     │    ADMIN     │
        │   ACTOR      │      │   ACTOR      │     │    ACTOR     │
        │              │      │              │     │              │
        └───────┬───────┘      └───────┬───────┘     └────────┬──────┘
                │                      │                      │
                │                      │                      │
                ▼                      ▼                      ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │ 1. Register      │  │ 2. Create Quiz   │  │6.Manage Users    │
        │    Account       │  │                  │  │                  │
        └──────────────────┘  └──────────────────┘  └──────────────────┘
                │                      │                      │
                ▼                      ▼                      ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │ 2. Face ID Login │  │ 3. Enroll Face   │  │7. View Analytics │
        │                  │  │    Recognition   │  │                  │
        └──────────────────┘  └──────────────────┘  └──────────────────┘
                │                      │                      │
                ▼                      ▼                      ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │ 3. Attempt Quiz  │  │ 4. Mark          │  │8. Configure      │
        │                  │  │    Attendance    │  │   System         │
        └──────────────────┘  └──────────────────┘  └──────────────────┘
                │                      │                      │
                ▼                      ▼                      ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │ 4. View Results  │  │ 5. Grade Quiz    │  │9. Blockchain     │
        │                  │  │                  │  │   Management     │
        └──────────────────┘  └──────────────────┘  └──────────────────┘
                │                      │                      │
                ▼                      ▼                      ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │ 5. View Profile  │  │ 6. View Class    │  │10.Audit Logs     │
        │                  │  │    Analytics     │  │                  │
        └──────────────────┘  └──────────────────┘  └──────────────────┘
                │                      │                      │
                ▼                      ▼                      ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │ 6. Attend Class  │  │ 7. Broadcast     │  │11.Backup         │
        │                  │  │    Recording     │  │   Database       │
        └──────────────────┘  └──────────────────┘  └──────────────────┘
                │                      │                      
                ▼                      ▼                      
        ┌──────────────────┐  ┌──────────────────┐  
        │ 7. Chat with     │  │ 8. Assign        │  
        │    Peers         │  │    Homework      │  
        └──────────────────┘  └──────────────────┘  
                │                      │                
                ▼                      ▼                
        ┌──────────────────┐  ┌──────────────────┐
        │ 8. Download      │  │ 9. Generate      │
        │    Certificate   │  │    Report Card   │
        └──────────────────┘  └──────────────────┘
                │                      │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────────────────┐
                │<<include>> Face Authentication   │
                │<<include>> Generate PDF Report   │
                │<<include>> Send Notification     │
                │<<include>> Update Blockchain     │
                │<<include>> Cache Results         │
                └──────────────────────────────────┘
```

---

## Detailed Use Cases

### Use Case 1: User Registration & Login

```
┌────────────────────────────────────────────────────────────────┐
│              USE CASE: REGISTRATION & LOGIN                     │
└────────────────────────────────────────────────────────────────┘

ACTOR: New User / Returning Student/Teacher
PRECONDITION: User has internet connection
POSTCONDITION: User successfully authenticated and logged in

MAIN FLOW:
1. User navigates to login page
2. System displays login options (Email/Password, Face ID)
3. User selects login method
   
   PATH A: Email/Password
   3.1. User enters email and password
   3.2. System validates credentials
   3.3. IF credentials valid:
       3.3.1. User proceeds to 2FA (if enabled)
       3.3.2. System validates OTP
       3.3.3. Generate JWT token
   3.4. IF credentials invalid:
       3.4.1. Increment failed login count
       3.4.2. Show error message
       3.4.3. IF failed attempts > 5:
           3.4.3.1. Lock account temporarily
           3.4.3.2. Send alert email

   PATH B: Face ID
   3.5. System initializes WebcamCapture component
   3.6. User captures face image
   3.7. System performs liveness detection
   3.8. IF not alive:
       3.8.1. Request new capture
       3.8.2. Go to 3.5
   3.9. System extracts face embedding
   3.10. System compares with stored template
   3.11. IF confidence > 95%:
        3.11.1. Authenticate user
   3.12. IF confidence < 95%:
        3.12.1. Show retry message
        3.12.2. Go to 3.5

4. System loads user dashboard
5. Update last_login timestamp
6. Log authentication event to database
7. Use case ends (Success)

ALTERNATIVE FLOWS:
- New User Registration:
  A1. User clicks "Sign Up"
  A2. System displays registration form
  A3. User fills details (email, password, name, user_type)
  A4. System validates input and checks email uniqueness
  A5. Hash password with bcrypt
  A6. Create user record in database
  A7. Send verification email
  A8. Use case ends

EXCEPTION FLOWS:
- E1. Network unavailable: Load from LocalStorage cache
- E2. Server down: Retry with exponential backoff
- E3. Account suspended: Show appropriate message
```

---

### Use Case 2: Quiz Attempt & Evaluation

```
┌────────────────────────────────────────────────────────────────┐
│           USE CASE: QUIZ ATTEMPT & EVALUATION                   │
└────────────────────────────────────────────────────────────────┘

ACTOR: Student
PRECONDITION: 
- Student is authenticated
- Quiz is published and available
- Student has not exceeded max attempts

POSTCONDITION: Quiz response recorded and evaluated

MAIN FLOW:
1. Student views available quizzes
2. Student selects a quiz
3. System checks eligibility:
   3.1. Check if quiz is within available date range
   3.2. Check if student has permission
   3.3. Check remaining attempts
4. IF eligible, system loads quiz:
   4.1. Fetch questions from server (or LocalStorage)
   4.2. Randomize question order (if enabled)
   4.3. Randomize answer options (if enabled)
   4.4. Display UI with:
       - Question counter
       - Timer countdown
       - Section navigation
       - Progress bar
5. System starts timer
6. LOOP: While quiz in progress
   6.1. Student views question
   6.2. Student selects/enters answer
   6.3. IF offline:
        6.3.1. Save to LocalStorage
        6.3.2. Queue submission on reconnect
   6.4. IF online:
        6.4.1. Auto-save to server (optional)
   6.5. Student navigates to next question
   6.6. IF time remaining > 0:
        6.6.1. Continue loop
   6.7. IF time expired:
        6.7.1. Auto-submit quiz
        6.7.2. Exit loop
7. Student submits quiz (or time expires)
8. System validates submission:
   8.1. Check all questions answered (if required)
   8.2. Verify submission timestamp
9. Store response to database
10. EVALUATE QUIZ:
    10.1. FOR each MCQ question:
         10.1.1. Compare student answer with correct answer
         10.1.2. Award full marks if correct
    10.2. FOR each Short Answer:
         10.2.1. Use NLP to evaluate
         10.2.2. Award marks based on match score
    10.3. FOR Subjective Essays:
         10.3.1. Mark as pending manual evaluation
         10.3.2. Notify teacher
    10.4. Calculate total score
    10.5. Calculate percentage
    10.6. Assign letter grade
    10.7. Generate feedback
11. IF show_answers enabled:
    11.1. Display answers with explanations
12. Update analytics metrics
13. Display results to student
14. Use case ends (Success)

ALTERNATIVE FLOWS:
- AI-Generated Quiz:
  A1. Teacher provides study notes
  A2. System calls Gemini API
  A3. AI generates questions automatically
  A4. Teacher reviews and publishes
  A5. Quiz available for students

EXCEPTION FLOWS:
- E1. Network lost during attempt:
  - Save progress to LocalStorage
  - Show "Operating Offline" message
  - Auto-sync when reconnected
- E2. Time expired before submission:
  - Auto-submit current answers
  - Show timeout message
- E3. Browser refresh:
  - Recover progress from LocalStorage
  - Allow continuation
```

---

### Use Case 3: Attendance Marking

```
┌────────────────────────────────────────────────────────────────┐
│              USE CASE: ATTENDANCE MARKING                        │
└────────────────────────────────────────────────────────────────┘

ACTOR: Student / Teacher
PRECONDITION:
- Active classroom session
- Student/Teacher within class duration

POSTCONDITION: Attendance marked and recorded

MAIN FLOW FOR STUDENT:
1. Student sees "Mark Attendance" button in classroom
2. Student clicks to mark attendance
3. System takes face image through WebcamCapture
4. System performs liveness detection
5. IF not alive: Request new image, go to 3
6. System extracts face embedding
7. System compares with enrolled face template:
   7.1. Calculate confidence score
   7.2. IF confidence > 90%:
       7.2.1. Mark attendance as PRESENT
       7.2.2. Record method as "Face_Recognition"
       7.2.3. Biometric_verified = TRUE
   7.3. IF confidence 70-90%:
       7.3.1. Mark as PRESENT (with confidence)
       7.3.2. Flag for teacher verification
   7.4. IF confidence < 70%:
       7.4.1. Show retry message
       7.4.2. Go to step 3
8. Record attendance with:
   - Student ID
   - Class ID
   - Session ID
   - Timestamp
   - Confidence score
   - Biometric data
9. Broadcast attendance event via WebSocket:
   9.1. Notify teacher of new attendance
   9.2. Update attendance list in real-time
10. Update analytics:
    10.1. Increment attendance count
    10.2. Update attendance percentage
11. IF attendance percentage < threshold:
    11.1. Generate alert
    11.2. Notify parent (if enabled)
12. Show confirmation to student
13. Use case ends (Success)

MAIN FLOW FOR TEACHER (Manual):
1. Teacher views class roster
2. Teacher selects attendance date
3. Teacher for each student:
   3.1. Click to mark PRESENT/ABSENT/LATE/EXCUSED
   3.2. Optionally add remarks
4. Teacher submits attendance
5. System records attendance records
6. System sends notifications to absent students' parents
7. Use case ends (Success)

BLOCKCHAIN INTEGRATION:
1. WEEKLY: System collects attendance records
2. Generate attendance certificate if:
   - Attendance % >= 75%
3. Calculate certificate hash
4. Submit to smart contract:
   - Student address
   - Attendance record
   - Certificate hash
5. Record blockchain transaction ID
6. Generate verification link
7. Notify student with verification QR code

EXCEPTION FLOWS:
- E1. Face enrollment not done:
  - Prompt to enroll face before marking
- E2. Poor lighting/image quality:
  - Show retry with guidance
- E3. Network down:
  - Queue for sync when online
```

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
    / \
   /   \ ─ Or/Else Fork ──┐
  /     \                 │
 /       \                │
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
               / \  ─ Decision ──┐
              /   \              │
             / OK? \             │
            /       \            │
           /         \           │
          / Yes ┐    No\         │
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
         / \  ─ Decision ──┐
        /   \              │
       / OK? \             │
      /       \            │
     / Yes ┐  No\          │
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
   └                   └              └             └                └
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
                                   ▼
                          ┌──────────────────┐
                          │ Log Event        │
                          │ - Timestamp      │
                          │ - User           │
                          │ - Action         │
                          └────────┬─────────┘
                                   │
                                   ▼
                                 [End]
```

