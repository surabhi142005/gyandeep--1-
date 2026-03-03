# 🔗 Entity Relationship Diagram (ERD) - Gyandeep

## Complete ER Diagram with Relationships

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                           GYANDEEP ENTITY RELATIONSHIP DIAGRAM                              │
│                                  (Complete System)                                           │
└──────────────────────────────────────────────────────────────────────────────────────────────┘


                                    ┌──────────────────┐
                                    │     USERS        │
                                    ├──────────────────┤
                                    │PK: user_id       │
                                    │   email          │
                                    │   full_name      │
                                    │   user_type      │
                                    │   password_hash  │
                                    └────────┬─────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    │                        │                        │
          1:1    ┌──▼──────────────┐  1:1 ┌─▼──────────────┐  1:N ┌──▼──────────────┐
        ═════════│BIOMETRIC_DATA   │      │STUDENT_INFO    │      │PARENT_CONTACT   │
                 ├──────────────────┤      ├─────────────────┤      ├──────────────────┤
                 │PK: biometric_id  │      │PK: student_id  │      │PK: parent_id     │
                 │FK: user_id (1:1) │      │FK: user_id(1:1)│      │FK: user_id (1:N) │
                 │   face_template  │      │   roll_number  │      │   phone_number   │
                 │   liveness_data  │      │   class_id ────┼─────┐│   address        │
                 │   enrollment_date│      │   enrollment.. │      │   relationship   │
                 └──────────────────┘      └──────────────┤ │      └──────────────────┘
                                                          │ │
                                                          │ │
                                            1:N        ┌──▼─┴─────────────┐
                                          ═════════════│    CLASSES       │
                                                       ├───────────────────┤
                                                       │PK: class_id       │
                                                       │   class_name      │
                                                       │   teacher_id ─────┼─┐
                                                       │   subject_id ─────┼─┤
                                                       │   semester        │ │
                                                       │   max_students    │ │
                                                       └──────────────────┤ │
                                                              │           │ │
                                                              │           │ │
                                            1:N          ┌────▼──┐   1:N │ │
                                          ═════════════════│TIMETABLE   │ │
                                                       ├─────────┤       │ │
                                                       │PK:...   │       │ │
                                                       │FK:class_id      │ │
                                                       │FK:teacher_id○───┼┼─┐
                                                       │FK:subject_id □──┼─┼─┤
                                                       │day_of_week │ │ │ │
                                                       │start_time  │ │ │ │
                                                       └─────────────┘ │ │ │
                                                                      1:N  │ │
                                      ┌───────────────────────────────────┘ │
                                      │                                     │
                  ┌───────────────────┼──────────────┬────────────────────────┤
                  │                   │              │                        │
                  │                   │              │                        │
          ┌───────▼───────┐   ┌──────▼──────┐  ┌────▼──────────┐   ┌────────▼───────┐
          │   SUBJECTS    │   │   TEACHERS  │  │   QUIZZES     │   │CLASSROOM_      │
          ├───────────────┤   ├─────────────┤  ├──────────────┤   │SESSIONS        │
          │PK: subject_id │   │PK:teacher_id   │PK: quiz_id    │   ├────────────────┤
          │   subject_code│   │FK:user_id(1:1)│   FK: class_id │   │PK: session_id  │
          │   subject_name│   │   department │   FK: teacher_id   │   FK: class_id  │
          │   credit_hours│   │   experience│   title         │   │   FK: teacher_id
          │   max_marks   │   │   hire_date │   duration      │   │   session_date  │
          │   pass_marks  │   └─────────────┘   max_marks     │   │   start_time    │
          └───────┬───────┘                      pass_marks    │   │   end_time      │
                  │                              published    │   │   status        │
                  │                      1:N  └──┬──────────┘   └────────────────┘
                  │                           │
                  │                           │
                  │             ┌─────────────┼──────────────────┐
                  │             │             │                  │
                  │        ┌────▼─────────┐┌──▼──────────────┐┌─▼────────────────┐
                  │        │QUIZ_QUESTIONS││QUIZ_ANSWERS     ││QUIZ_RESPONSES    │
                  │        ├──────────────┤├─────────────────┤├──────────────────┤
                  │        │PK: question..│PK: answer_id    ││PK: response_id   │
                  │        │FK: quiz_id   ││FK: question_id ││   FK: student_id ─┼──┐
                  │        │   question.. ││   answer_text   ││   FK: quiz_id     │  │
                  │        │   question.. ││   is_correct    ││   attempt_number  │  │
                  │        │   marks      ││   explanation.. ││   started_at      │  │
                  │        │   difficulty │└─────────────────┘│   submitted_at    │  │
                  │        └──────────────┘                    │   student_score   │  │
                  │                                            │   is_passed       │  │
                  │                                            │   feedback        │  │
                  │                                            └──────────────────┘  │
                  │                                                                   │
                  │                           1:N                                    │
                  │                    ═══════════════════                           │
                  │                                                    ┌─────────────┘
                  │                                                    │
      1:N    ┌────▼──────────────┐              ┌─────────────────────▼─┐
          ═══│   ATTENDANCE_      │              │   GRADES              │
             │   RECORDS          │              ├───────────────────────┤
             ├────────────────────┤              │PK: grade_id           │
             │PK: attendance_id   │              │   FK: student_id ─────┼─┐
             │   FK: student_id   │              │   FK: subject_id ─────┼─┤
             │   FK: class_id     │              │   FK: class_id        │ │
             │   FK: session_id   │              │   marks_obtained      │ │
             │   attendance_date  │              │   marks_total         │ │
             │   check_in_time    │              │   percentage          │ │
             │   status           │              │   letter_grade        │ │
             │   method           │              │   grade_point         │ │
             │   biometric_verified              │   is_final            │ │
             └────────────────────┘              └───────────────────────┘
                     │                                      │
                     │                                      │
                     │              1:N            1:N      │
                     │         ═════════════════════════════│
                     │                    │
                     │                    │
            ┌────────▼──────────────────┐ │
            │ ANALYTICS_METRICS         │ │
            ├───────────────────────────┤ │
            │PK: metric_id              │ │
            │   FK: student_id ─────────├─┤
            │   FK: quiz_id             │
            │   avg_score               │
            │   accuracy_rate           │
            │   engagement_score        │
            │   learning_progress       │
            │   last_activity_date      │
            └───────────────────────────┘


┌─────────────────────────────────────────────┐
│         ADDITIONAL TABLES                    │
└─────────────────────────────────────────────┘

┌──────────────────────┐    ┌──────────────────────┐
│BLOCKCHAIN_RECORDS    │    │CHAT_MESSAGES         │
├──────────────────────┤    ├──────────────────────┤
│PK: record_id         │    │PK: message_id        │
│   FK: student_id     │    │   FK: sender_id      │
│   record_type        │    │   FK: receiver_id    │
│   transaction_hash   │    │   FK: session_id     │
│   contract_address   │    │   message_text       │
│   block_number       │    │   is_read            │
│   status             │    │   sent_at            │
│   blockchain_hash    │    │   read_at            │
└──────────────────────┘    └──────────────────────┘

    ┌──────────────────────┐
    │CERTIFICATES          │
    ├──────────────────────┤
    │PK: cert_id           │
    │   FK: student_id     │
    │   cert_type          │
    │   issue_date         │
    │   expiry_date        │
    │   certificate_number │
    │   issued_by_id       │
    │   blockchain_hash    │
    │   status             │
    └──────────────────────┘
```

---

## Relationship Matrix

### 1:1 Relationships (One-to-One)

```
┌──────────────────────────────────────────────────────────┐
│                    1:1 RELATIONSHIPS                      │
└──────────────────────────────────────────────────────────┘

USERS ────────────────► BIOMETRIC_DATA
   ↓ (1 user has exactly 1 biometric record)
   │ Cardinality: 1:1
   └─ Constraint: UNIQUE(user_id) in biometric_data

USERS ────────────────► STUDENT_INFO
   ↓ (1 user is exactly 1 student)
   │ Cardinality: 1:1
   │ Optional: Student users only
   └─ Constraint: UNIQUE(user_id) in student_info

USERS ────────────────► TEACHER_INFO
   ↓ (1 user is exactly 1 teacher)
   │ Cardinality: 1:1
   │ Optional: Teacher users only
   └─ Constraint: UNIQUE(user_id) in teacher_info
```

### 1:N Relationships (One-to-Many)

```
┌──────────────────────────────────────────────────────────┐
│                    1:N RELATIONSHIPS                      │
└──────────────────────────────────────────────────────────┘

USERS ─────────────────────────► PARENT_CONTACT
   ↓ (1 user can have many parent contacts)
   └─ Cardinality: 1:N
      Meaning: One user record with multiple parent contacts

CLASSES ────────────────────────► STUDENT_INFO
   ↓ (1 class has many students)
   └─ Cardinality: 1:N
      Meaning: Multiple students enrolled in one class
      Cascade: If class deleted, students' class_id becomes NULL

CLASSES ────────────────────────► QUIZZES
   ↓ (1 class has many quizzes)
   └─ Cardinality: 1:N
      Meaning: Multiple quizzes created for one class

CLASSES ────────────────────────► CLASSROOM_SESSIONS
   ↓ (1 class has many sessions)
   └─ Cardinality: 1:N
      Meaning: Multiple class sessions conducted

CLASSES ────────────────────────► CLASS_TIMETABLE
   ↓ (1 class has many timetable entries)
   └─ Cardinality: 1:N
      Meaning: Multiple schedule slots per week

CLASSES ────────────────────────► ATTENDANCE_RECORDS
   ↓ (1 class has many attendance records)
   └─ Cardinality: 1:N
      Meaning: Attendance tracked for each class session

SUBJECTS ────────────────────────► CLASSES
   ↓ (1 subject has many classes)
   └─ Cardinality: 1:N
      Meaning: Multiple classes teaching same subject

SUBJECTS ────────────────────────► GRADES
   ↓ (1 subject has many grades)
   └─ Cardinality: 1:N
      Meaning: Multiple students get grades for same subject

TEACHERS ────────────────────────► CLASSES
   ↓ (1 teacher teaches many classes - multiple subjects)
   └─ Cardinality: 1:N

TEACHERS ────────────────────────► QUIZZES
   ↓ (1 teacher creates many quizzes)
   └─ Cardinality: 1:N

TEACHERS ────────────────────────► CLASSROOM_SESSIONS
   ↓ (1 teacher conducts many sessions)
   └─ Cardinality: 1:N

QUIZZES ─────────────────────────► QUIZ_QUESTIONS
   ↓ (1 quiz has many questions)
   └─ Cardinality: 1:N
      Meaning: Multiple questions in one quiz

QUIZ_QUESTIONS ──────────────────► QUIZ_ANSWERS
   ↓ (1 question has many answer options)
   └─ Cardinality: 1:N
      Meaning: MCQ options like A, B, C, D

QUIZZES ─────────────────────────► QUIZ_RESPONSES
   ↓ (1 quiz has many student responses)
   └─ Cardinality: 1:N
      Meaning: Multiple students attempt same quiz

STUDENT_INFO ────────────────────► QUIZ_RESPONSES
   ↓ (1 student has many quiz responses)
   └─ Cardinality: 1:N
      Meaning: Student attempts multiple quizzes

STUDENT_INFO ────────────────────► GRADES
   ↓ (1 student has many grades)
   └─ Cardinality: 1:N
      Meaning: One grade per subject per student

STUDENT_INFO ────────────────────► ATTENDANCE_RECORDS
   ↓ (1 student has many attendance records)
   └─ Cardinality: 1:N
      Meaning: Attendance tracked daily per student

STUDENT_INFO ────────────────────► ANALYTICS_METRICS
   ↓ (1 student has many analytics records)
   └─ Cardinality: 1:N
      Meaning: Metrics updated regularly

STUDENT_INFO ────────────────────► BLOCKCHAIN_RECORDS
   ↓ (1 student has many blockchain records)
   └─ Cardinality: 1:N
      Meaning: Multiple certificates/records on blockchain

STUDENT_INFO ────────────────────► CERTIFICATES
   ↓ (1 student has many certificates)
   └─ Cardinality: 1:N
      Meaning: Certificates for different achievements

CLASSROOM_SESSIONS ──────────────► ATTENDANCE_RECORDS
   ↓ (1 session has many attendance records)
   └─ Cardinality: 1:N
      Meaning: Multiple students mark attendance per session

CLASSROOM_SESSIONS ──────────────► CHAT_MESSAGES
   ↓ (1 session has many chat messages)
   └─ Cardinality: 1:N
      Meaning: Students chat during class

USERS ─────────────────────────► CHAT_MESSAGES (as sender)
   ↓ (1 user sends many messages)
   └─ Cardinality: 1:N

USERS ─────────────────────────► CHAT_MESSAGES (as receiver)
   ↓ (1 user receives many messages)
   └─ Cardinality: 1:N
```

---

## M:N Relationships (Many-to-Many)

Currently handled through junction tables or denormalized in JSON fields:

```
STUDENTS ◄─────────────► CLASSES
   │                        │
   └─ Via student_info.class_id
      Meaning: Multiple students in one class, 
               one student in one class (currently)

TEACHERS ◄─────────────► SUBJECTS
   │                        │
   └─ Via assigned_classes in teacher_info
      Meaning: One teacher can teach multiple subjects,
               One subject taught by multiple teachers
```

---

## Complete Cardinality Summary

| Relationship | Type | Explanation |
|---|---|---|
| USERS → BIOMETRIC_DATA | 1:1 | Each user has exactly one biometric record |
| USERS → STUDENT_INFO | 1:1 | Each student user has one student record |
| USERS → TEACHER_INFO | 1:1 | Each teacher user has one teacher record |
| USERS → PARENT_CONTACT | 1:N | One parent user can have multiple contact records |
| CLASSES → STUDENT_INFO | 1:N | One class has many students |
| CLASSES → QUIZZES | 1:N | One class has many quizzes |
| CLASSES → CLASSROOM_SESSIONS | 1:N | One class has many sessions |
| CLASSES → CLASS_TIMETABLE | 1:N | One class has multiple timetable entries |
| CLASSES → ATTENDANCE_RECORDS | 1:N | One class has many attendance records |
| SUBJECTS → CLASSES | 1:N | One subject has many classes |
| SUBJECTS → GRADES | 1:N | One subject has many grades |
| TEACHERS → CLASSES | 1:N | One teacher teaches multiple classes |
| TEACHERS → QUIZZES | 1:N | One teacher creates multiple quizzes |
| TEACHERS → CLASSROOM_SESSIONS | 1:N | One teacher conducts multiple sessions |
| QUIZZES → QUIZ_QUESTIONS | 1:N | One quiz has many questions |
| QUIZ_QUESTIONS → QUIZ_ANSWERS | 1:N | One question has multiple answer options |
| QUIZZES → QUIZ_RESPONSES | 1:N | One quiz has many student responses |
| STUDENT_INFO → QUIZ_RESPONSES | 1:N | One student has many quiz responses |
| STUDENT_INFO → GRADES | 1:N | One student has multiple grades |
| STUDENT_INFO → ATTENDANCE_RECORDS | 1:N | One student has many attendance records |
| STUDENT_INFO → ANALYTICS_METRICS | 1:N | One student has multiple metric records |
| STUDENT_INFO → BLOCKCHAIN_RECORDS | 1:N | One student has multiple blockchain records |
| STUDENT_INFO → CERTIFICATES | 1:N | One student has multiple certificates |
| CLASSROOM_SESSIONS → ATTENDANCE_RECORDS | 1:N | One session has many attendance records |
| CLASSROOM_SESSIONS → CHAT_MESSAGES | 1:N | One session has many messages |
| USERS → CHAT_MESSAGES | 1:N | One user sends/receives multiple messages |

---

## Foreign Key Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              FOREIGN KEY DEPENDENCY GRAPH                        │
└─────────────────────────────────────────────────────────────────┘

                        USERS (Base Entity)
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    BIOMETRIC_DATA    STUDENT_INFO      TEACHER_INFO
        │                   │                   │
        │                   │                   │
        │         ┌─────────┼─────────┐         │
        │         │         │         │         │
        ▼         ▼         ▼         ▼         │
    CLASSES◄──────────────────────────┘         │
        │                                       │
        ├─────────────────────────────────────► CLASS_TIMETABLE
        │
        ├─────────────────────────────────────► QUIZZES
        │                                           │
        │                                           ▼
        │                                       QUIZ_QUESTIONS
        │                                           │
        │                                           ▼
        │                                       QUIZ_ANSWERS
        │                                           │
        │                                           ▼
        │                                       QUIZ_RESPONSES◄─────┐
        │                                                           │
        ├─────────────────────────────────────► CLASSROOM_SESSIONS │
        │                                           │               │
        │                                           ├──────────────► STUDENT_INFO
        │                                           │
        │                                           ▼
        │                                       CHAT_MESSAGES◄──────► USERS
        │
        ├─────────────────────────────────────► ATTENDANCE_RECORDS
        │                                           │
        │         ┌─────────────────────────────────┘
        │         │
        └─────────┼────────────────────────────────┐
                  │                                │
                  ▼                                ▼
              GRADES                      ANALYTICS_METRICS
                  │                                │
                  ▼                                ▼
            BLOCKCHAIN_RECORDS         BLOCKCHAIN_RECORDS
                  │
                  ▼
            CERTIFICATES
```

---

## Integrity Constraints

### Primary Keys
```
Every table has a PRIMARY KEY constraint on its ID field
Examples:
- PRIMARY KEY (user_id)
- PRIMARY KEY (class_id)
- PRIMARY KEY (quiz_id)
etc.
```

### Foreign Keys
```
All relationships enforced with FOREIGN KEY constraints:

STUDENT_INFO: FOREIGN KEY (user_id) REFERENCES USERS(user_id)
STUDENT_INFO: FOREIGN KEY (class_id) REFERENCES CLASSES(class_id)
QUIZZES: FOREIGN KEY (class_id) REFERENCES CLASSES(class_id)
QUIZZES: FOREIGN KEY (teacher_id) REFERENCES TEACHER_INFO(teacher_id)
etc.
```

### Unique Constraints
```
- USERS.email (UNIQUE): No duplicate emails
- STUDENT_INFO.roll_number (UNIQUE): Unique roll numbers
- STUDENT_INFO.admission_number (UNIQUE): Unique admission ID
- SUBJECTS.subject_code (UNIQUE): Unique subject codes
- CERTIFICATES.certificate_number (UNIQUE): Unique cert numbers
- BLOCKCHAIN_RECORDS.transaction_hash (UNIQUE): Unique blockchain txs
```

### Not Null Constraints
```
Critical fields marked NOT NULL:
- USERS: email, password_hash, full_name, user_type
- BIOMETRIC_DATA: face_template, liveness_score, enrollment_date
- CLASSES: class_name, semester, max_students
- QUIZZES: quiz_title, total_questions, duration_minutes
- QUIZ_QUESTIONS: question_text, marks
etc.
```

### Check Constraints
```
- valid percentage values (0-100)
- valid status enums
- valid difficulty levels
- marks > 0
- dates in valid range
```

---

## Referential Integrity Rules

### Cascade Delete
```
When a parent record is deleted, related child records are deleted:
- DELETE CLASSES cascades to QUIZZES, CLASSROOM_SESSIONS, etc.
- DELETE QUIZZES cascades to QUIZ_QUESTIONS, QUIZ_RESPONSES
- DELETE USERS cascades to related records (with careful handling)
```

### Set Null on Delete
```
When a parent is deleted, child reference becomes NULL:
- DELETE TEACHER from CLASSES → class teacher_id becomes NULL
- DELETE concept-specific records
```

### Restrict Delete
```
Prevent delete if child records exist:
- Cannot delete USERS if has ATTENDANCE_RECORDS (security/audit)
- Cannot delete SUBJECTS if has active CLASSES
```

---

## Entity Dependency Chain

```
Independent Entities (No FK: depend on nothing):
├─ USERS
└─ SUBJECTS


Level 1 (Depends on independent):
├─ BIOMETRIC_DATA (FK: users)
├─ STUDENT_INFO (FK: users, classes)
├─ TEACHER_INFO (FK: users)
└─ PARENT_CONTACT (FK: users)


Level 2:
├─ CLASSES (FK: teachers, subjects)
├─ CLASS_TIMETABLE (FK: classes, teachers, subjects)
├─ CLASSROOM_SESSIONS (FK: classes, teachers)
└─ QUIZZES (FK: classes, teachers)


Level 3:
├─ QUIZ_QUESTIONS (FK: quizzes)
├─ QUIZ_RESPONSES (FK: quizzes, students)
├─ ATTENDANCE_RECORDS (FK: students, classes, sessions)
├─ GRADES (FK: students, subjects, classes)
└─ CHAT_MESSAGES (FK: users, sessions)


Level 4:
├─ QUIZ_ANSWERS (FK: quiz_questions)
├─ ANALYTICS_METRICS (FK: students, quizzes)
└─ CERTIFICATES (FK: students)


Level 5:
└─ BLOCKCHAIN_RECORDS (FK: students)
```

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Entities | 17 |
| 1:1 Relationships | 3 |
| 1:N Relationships | 30+ |
| M:N Relationships | 2 (implicit) |
| Foreign Keys | 40+ |
| Primary Keys | 17 |
| Unique Constraints | 10 |
| Not Null Fields | 50+ |

