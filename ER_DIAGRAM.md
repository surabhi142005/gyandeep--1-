# Gyandeep ER Diagram

## Entity-Relationship Model

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                ENTITIES                                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                              │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐         ┌──────────────┐                 │
│  │    CLASS     │         │   SUBJECT    │         │    USER      │         │ CLASSSUBJECT │ (Weak)         │
│  ├──────────────┤         ├──────────────┤         ├──────────────┤         ├──────────────┤                 │
│  │ - id (PK)    │◄──M:N──►│ - id (PK)    │         │ - id (PK)    │         │ - id (PK)    │                 │
│  │ - odId       │         │ - odId       │         │ - odId       │         │ - odId       │                 │
│  │ - name       │         │ - name       │         │ - name       │         │ - classId    │                 │
│  │ - createdAt  │         │ - createdAt  │         │ - email      │         │ - subjectId  │                 │
│  └──────────────┘         └──────────────┘         │ - role       │         │ - primaryT.. │                 │
│       │                                          │ - password   │         └──────────────┘                 │
│       │1:N                                        │ - faceImage  │                 │                      │
│       │                                          │ - classId    │◄──────┬─────────►                      │
│       ▼                                          └──────────────┘        │                                  │
│  ┌──────────────────────────────────┐                  │                  │                                  │
│  │         CLASSSESSION             │                  │                  │                                  │
│  ├──────────────────────────────────┤                  │                  │                                  │
│  │ - id (PK)                        │                  │                  │                                  │
│  │ - odId                           │                  │                  │                                  │
│  │ - code                           │                  │                  │                                  │
│  │ - teacherId (FK) ────────────────┼──────────────────┼──────────────────┘                                  │
│  │ - classId (FK)                   │◄─────────────────┤                                                   │
│  │ - subjectId (FK) ────────────────┼──────────────────┤                                                   │
│  │ - expiry                         │                  │                                                   │
│  │ - endedAt                        │                  │                                                   │
│  │ - quizPublished                  │                  │                                                   │
│  │ - sessionStatus                  │                  │                                                   │
│  └──────────────────────────────────┘                  │                                                   │
│       │                                               │                                                   │
│       │1:N                                            │                                                   │
│       │                                               │                                                   │
│  ┌────┴─────────┐         ┌──────────────┐    ┌──────┴───────┐         ┌──────────────┐                    │
│  │SESSIONNOTE   │         │   QUIZ       │    │ ATTENDANCE   │         │    GRADE     │                    │
│  │  (Weak)      │         ├──────────────┤    ├──────────────┤         ├──────────────┤                    │
│  ├──────────────┤         │ - id (PK)    │    │ - id (PK)    │         │ - id (PK)    │                    │
│  │ - id (PK)    │         │ - odId       │    │ - odId       │         │ - odId       │                    │
│  │ - odId       │         │ - sessionId  │    │ - sessionId  │         │ - studentId  │                    │
│  │ - sessionId  │◄──M:1───│ - teacherId  │◄───│ - studentId  │         │ - subjectId  │                    │
│  │ - authorId   │         │ - title      │    │ - status     │         │ - category   │                    │
│  │ - content    │         │ - published  │    │ - markedAt   │         │ - score      │                    │
│  │ - filePath   │         │ - quizType   │    │ - verifiedAt │         │ - maxScore   │                    │
│  └──────────────┘         └──────────────┘    └──────────────┘         │ - teacherId  │                    │
│                           │1:N                                         │ - sessionId  │                    │
│                           │                                            └──────────────┘                    │
│                    ┌──────┴───────┐                                                                │
│                    │ QUIZQUESTION │                                                                │
│                    ├──────────────┤                                                                │
│                    │ - id (PK)    │                                                                │
│                    │ - odId       │                                                                │
│                    │ - quizId     │◄───┐                                                          │
│                    │ - question   │    │1:N                                                        │
│                    │ - options    │    │                                                           │
│                    │ - correctAns │    │                                                           │
│                    └──────────────┘    │                                                           │
│                                         │                                                           │
│                           ┌─────────────┴─────────────┐                                           │
│                           │      QUIZATTEMPT          │ (Weak)                                      │
│                           ├────────────────────────────┤                                             │
│                           │ - id (PK)                 │                                             │
│                           │ - odId                    │                                             │
│                           │ - quizId (FK) ────────────┘                                             │
│                           │ - studentId (FK)                                                         │
│                           │ - answersJson                                                             │
│                           │ - correctCount                                                            │
│                           │ - percentage                                                              │
│                           │ - attemptNumber          │                                              │
│                           └────────────────────────────┘                                              │
│                                      │1:N                                                            │
│                                      │                                                                │
│                           ┌──────────┴──────────┐                                                    │
│                           │   ATTEMPTANSWER     │ (Weak)                                            │
│                           ├─────────────────────┤                                                    │
│                           │ - id (PK)           │                                                    │
│                           │ - odId              │                                                    │
│                           │ - attemptId (FK)    │◄────┐                                              │
│                           │ - questionId (FK)   │◄────┘                                              │
│                           │ - answerGiven       │                                                     │
│                           │ - isCorrect         │                                                     │
│                           └─────────────────────┘                                                     │
│                                                                                                         │
│  ┌──────────────────┐         ┌──────────────┐         ┌──────────────┐         ┌──────────────┐      │
│  │CENTRALIZEDNOTE   │         │  TICKET      │         │  TICKETREPLY │ (Weak)  │ NOTIFICATION │      │
│  ├──────────────────┤         ├──────────────┤         ├──────────────┤         ├──────────────┤      │
│  │ - id (PK)        │         │ - id (PK)    │         │ - id (PK)    │         │ - id (PK)    │      │
│  │ - odId           │         │ - odId       │◄───1:N──│ - odId       │         │ - odId       │      │
│  │ - classId (FK)   │         │ - userId     │         │ - ticketId   │         │ - userId     │◄─────┤
│  │ - subjectId (FK) │         │ - assignedTo │         │ - userId     │         │ - type       │      │
│  │ - sessionId (FK) │         │ - classId    │         │ - message    │         │ - title      │      │
│  │ - unitNumber     │         │ - subject    │         │ - createdAt  │         │ - relatedId  │      │
│  │ - title          │         │ - message     │         └──────────────┘         │ - read       │      │
│  │ - content        │         │ - status      │                                └──────────────┘      │
│  │ - filePath       │         │ - priority    │                                     │               │
│  │ - teacherId      │         │ - createdAt   │                                     │               │
│  └──────────────────┘         └──────────────┘                                     │               │
│        │                             │                                            │               │
│        │1:N                          │1:N                                         │               │
│        │                             │                                            │               │
│  ┌─────┴────────┐              ┌──────┴───────┐                                   │               │
│  │USERSUBJECT   │              │ANNOUNCEMENT  │                                   │               │
│  ├──────────────┤              ├──────────────┤                                   │               │
│  │ - id (PK)    │              │ - id (PK)    │                                   │               │
│  │ - odId       │              │ - odId       │                                   │               │
│  │ - userId     │◄─────────────│ - authorId   │◄──────────────────────────────────┘               │
│  │ - subjectId  │              │ - classId    │                                                    │
│  │ - certified  │              │ - subjectId  │                                                    │
│  └──────────────┘              │ - title      │                                                    │
│                                │ - content    │                                                    │
│                                └──────────────┘                                                    │
│                                                                                                         │
│  ┌──────────────────┐         ┌────────────────┐         ┌────────────────┐                           │
│  │ TEACHERINSIGHT  │         │   AUDITLOG    │         │ IDEMPOTENCYKEY │                           │
│  ├──────────────────┤         ├────────────────┤         ├────────────────┤                           │
│  │ - id (PK)        │         │ - id (PK)     │         │ - id (PK)      │                           │
│  │ - odId           │         │ - odId        │         │ - key          │                           │
│  │ - teacherId     │         │ - ts          │         │ - userId       │                           │
│  │ - sessionId     │         │ - type        │         │ - action       │                           │
│  │ - subjectId     │         │ - userId      │         │ - responseBody │                           │
│  │ - insightText   │         │ - details     │         └────────────────┘                              │
│  │ - actedOnById   │         └────────────────┘                                                      │
│  └──────────────────┘                                                                                  │
│                                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Entities Summary

### Strong Entities

| Entity | Primary Key | Description |
|--------|-------------|-------------|
| CLASS | id | Represents a student class/grade |
| SUBJECT | id | Academic subjects (Math, Science, etc.) |
| USER | id | Students, Teachers, and Admins |
| CLASSSESSION | id | Active class sessions with attendance codes |
| TIMETABLEENTRY | id | Scheduled class slots |
| QUIZ | id | Quiz created by teachers |
| CENTRALIZEDNOTE | id | Shared learning notes |
| ATTENDANCE | id | Student attendance records |
| GRADE | id | Student grades and scores |
| TICKET | id | Support tickets |
| NOTIFICATION | id | User notifications |
| ANNOUNCEMENT | id | Class announcements |
| TEACHERINSIGHT | id | AI-generated teaching insights |
| AUDITLOG | id | Security audit trail |
| IDEMPOTENCYKEY | id | API idempotency keys |

### Weak Entities

| Weak Entity | Identifying Owner | Description |
|-------------|-------------------|-------------|
| CLASSSUBJECT | CLASS + SUBJECT | Junction table linking classes to subjects |
| SESSIONNOTE | CLASSSESSION | Notes created during a class session |
| QUIZQUESTION | QUIZ | Questions belonging to a quiz |
| QUIZATTEMPT | QUIZ + USER | Student's attempt at a quiz |
| ATTEMPTANSWER | QUIZATTEMPT | Answer to a specific question |
| TICKETREPLY | TICKET | Replies to a support ticket |
| USERSUBJECT | USER + SUBJECT | Teacher's expertise in subjects |

---

## Relationships

### Relationship Definitions

| Relationship | Entity 1 | Entity 2 | Type | Cardinality | Description |
|--------------|----------|----------|------|-------------|-------------|
| Teaches | USER | CLASSSESSION | 1:N | 1 teacher : N sessions | A teacher can conduct multiple class sessions |
| Enrolled | CLASS | USER | 1:N | 1 class : N students | A class can have multiple enrolled students |
| HasSession | CLASS | CLASSSESSION | 1:N | 1 class : N sessions | Classes can have multiple sessions |
| Covers | SUBJECT | CLASSSESSION | 1:N | 1 subject : N sessions | A subject is taught in multiple sessions |
| Offers | CLASS | CLASSSUBJECT | 1:N | 1 class : N subject offerings | Class offers multiple subjects |
| OfferedAs | SUBJECT | CLASSSUBJECT | 1:N | 1 subject : N class offerings | Subject is offered to multiple classes |
| PrimaryTeacher | USER | CLASSSUBJECT | 1:N | 1 teacher : N subject offerings | Teacher can be primary for multiple offerings |
| ExpertIn | USER | USERSUBJECT | 1:N | 1 user : N subject expertise | Teachers can specialize in multiple subjects |
| ExpertiseIn | SUBJECT | USERSUBJECT | 1:N | 1 subject : N teacher expertise | Subjects can have multiple expert teachers |
| Contains | CLASSSESSION | SESSIONNOTE | 1:N | 1 session : N session notes | Session can have multiple notes |
| Authored | USER | SESSIONNOTE | 1:N | 1 user : N session notes | Users can author multiple session notes |
| Has | CLASSSESSION | QUIZ | 1:N | 1 session : N quizzes | Sessions can have multiple quizzes |
| Created | USER | QUIZ | 1:N | 1 teacher : N quizzes | Teachers create multiple quizzes |
| BelongsTo | QUIZ | QUIZQUESTION | 1:N | 1 quiz : N questions | Quiz contains multiple questions |
| CreatedBy | USER | QUIZQUESTION | 1:N | 1 user : N questions | Teachers create quiz questions |
| Attempts | USER | QUIZATTEMPT | 1:N | 1 student : N attempts | Students can attempt quizzes multiple times |
| For | QUIZ | QUIZATTEMPT | 1:N | 1 quiz : N attempts | Quiz can be attempted by multiple students |
| Answered | QUIZATTEMPT | ATTEMPTANSWER | 1:N | 1 attempt : N answers | Each attempt answers multiple questions |
| Questions | QUIZQUESTION | ATTEMPTANSWER | 1:N | 1 question : N attempted answers | Questions have answers in attempts |
| MarkedFor | CLASSSESSION | ATTENDANCE | 1:N | 1 session : N attendance | Session tracks attendance for all students |
| Present | USER | ATTENDANCE | 1:N | 1 student : N attendance | Student has attendance in multiple sessions |
| Verified | USER | ATTENDANCE | 1:N | 1 verifier : N verifications | Teachers verify student attendance |
| HasGrade | USER | GRADE | 1:N | 1 student : N grades | Student receives multiple grades |
| Given | USER | GRADE | 1:N | 1 teacher : N grades | Teachers give grades to students |
| ForSubject | SUBJECT | GRADE | 1:N | 1 subject : N grades | Subject has multiple grade entries |
| InSession | CLASSSESSION | GRADE | 1:N | 1 session : N grades | Session can have associated grades |
| Created | USER | TICKET | 1:N | 1 user : N tickets | Users create support tickets |
| Assigned | USER | TICKET | 1:N | 1 admin : N tickets | Admins get assigned tickets |
| BelongsTo | CLASS | TICKET | 1:N | 1 class : N tickets | Class can have multiple tickets |
| Has | TICKET | TICKETREPLY | 1:N | 1 ticket : N replies | Ticket can have multiple replies |
| Responded | USER | TICKETREPLY | 1:N | 1 user : N replies | Users can reply to tickets |
| ForNote | CENTRALIZEDNOTE | USERNOTEACCESS | 1:N | 1 note : N accesses | Notes track who accessed them |
| Accesses | USER | USERNOTEACCESS | 1:N | 1 user : N accesses | Users access multiple notes |
| HasFor | CLASS | CENTRALIZEDNOTE | 1:N | 1 class : N notes | Class has multiple centralized notes |
| About | SUBJECT | CENTRALIZEDNOTE | 1:N | 1 subject : N notes | Subject has multiple notes |
| Related | CLASSSESSION | CENTRALIZEDNOTE | 1:N | 1 session : N notes | Session can have linked notes |
| Uploaded | USER | CENTRALIZEDNOTE | 1:N | 1 teacher : N notes | Teachers upload notes |
| Notifies | USER | NOTIFICATION | 1:N | 1 user : N notifications | User receives multiple notifications |
| Posted | USER | ANNOUNCEMENT | 1:N | 1 author : N announcements | Teachers/Admins post announcements |
| Targets | CLASS | ANNOUNCEMENT | 1:N | 1 class : N announcements | Class receives announcements |
| RelatedTo | SUBJECT | ANNOUNCEMENT | 1:N | 1 subject : N announcements | Announcements can relate to subjects |
| Generated | USER | TEACHERINSIGHT | 1:N | 1 teacher : N insights | Teachers receive AI insights |
| About | CLASSSESSION | TEACHERINSIGHT | 1:N | 1 session : N insights | Sessions generate insights |
| ForSubject | SUBJECT | TEACHERINSIGHT | 1:N | 1 subject : N insights | Subject has insights |
| ActedOn | USER | TEACHERINSIGHT | 1:N | 1 user : N acted insights | Users act on insights |
| Logged | USER | AUDITLOG | 1:N | 1 user : N logs | User actions are audited |

---

## Cardinality Summary

### One-to-One (1:1)

| Relationship | Description |
|--------------|-------------|
| GRADE ↔ QUIZATTEMPT | Each quiz grade is linked to one attempt |

### One-to-Many (1:N)

| Parent Entity | Child Entity | Description |
|---------------|--------------|-------------|
| CLASS | USER | Students enrolled in one class |
| CLASS | CLASSSESSION | Class has multiple sessions |
| SUBJECT | CLASSSESSION | Subject taught in multiple sessions |
| USER | CLASSSESSION | Teacher conducts many sessions |
| CLASS | CLASSSUBJECT | Class offers many subjects |
| SUBJECT | CLASSSUBJECT | Subject offered to many classes |
| USER | CLASSSUBJECT | Teacher primary for subject offerings |
| USER | USERSUBJECT | Teacher expert in many subjects |
| SUBJECT | USERSUBJECT | Subject has many expert teachers |
| CLASSSESSION | SESSIONNOTE | Session has many notes |
| USER | SESSIONNOTE | User authors many notes |
| CLASSSESSION | QUIZ | Session has many quizzes |
| USER | QUIZ | Teacher creates many quizzes |
| QUIZ | QUIZQUESTION | Quiz has many questions |
| USER | QUIZQUESTION | Teacher creates many questions |
| USER | QUIZATTEMPT | Student attempts many quizzes |
| QUIZ | QUIZATTEMPT | Quiz attempted by many students |
| QUIZATTEMPT | ATTEMPTANSWER | Attempt answers many questions |
| QUIZQUESTION | ATTEMPTANSWER | Question answered in many attempts |
| CLASSSESSION | ATTENDANCE | Session records many attendance |
| USER | ATTENDANCE | Student has many attendance |
| USER | GRADE | Student receives many grades |
| USER | GRADE | Teacher gives many grades |
| SUBJECT | GRADE | Subject has many grades |
| CLASSSESSION | GRADE | Session has grades |
| USER | TICKET | User creates many tickets |
| USER | TICKET | Admin manages many tickets |
| CLASS | TICKET | Class has many tickets |
| TICKET | TICKETREPLY | Ticket has many replies |
| USER | TICKETREPLY | User replies many times |
| CENTRALIZEDNOTE | USERNOTEACCESS | Note accessed by many users |
| USER | USERNOTEACCESS | User accesses many notes |
| CLASS | CENTRALIZEDNOTE | Class has many notes |
| SUBJECT | CENTRALIZEDNOTE | Subject has many notes |
| CLASSSESSION | CENTRALIZEDNOTE | Session has linked notes |
| USER | CENTRALIZEDNOTE | Teacher uploads many notes |
| USER | NOTIFICATION | User receives many notifications |
| USER | ANNOUNCEMENT | Author posts many announcements |
| CLASS | ANNOUNCEMENT | Class receives many announcements |
| SUBJECT | ANNOUNCEMENT | Subject has many announcements |
| USER | TEACHERINSIGHT | Teacher gets many insights |
| CLASSSESSION | TEACHERINSIGHT | Session generates insights |
| SUBJECT | TEACHERINSIGHT | Subject has insights |
| USER | TEACHERINSIGHT | User acts on insights |
| USER | AUDITLOG | User has audit history |

---

## Relationship Descriptions

### Authentication & User Management

| Relationship | Description |
|--------------|-------------|
| Enrolled | Links students to their class. Each student belongs to exactly one class. |
| Teaches | Links teachers to class sessions they conduct. Teachers can conduct multiple sessions. |
| ExpertIn / ExpertiseIn | Links teachers to subjects they are qualified to teach. |

### Session & Attendance

| Relationship | Description |
|--------------|-------------|
| HasSession | Each class can have multiple class sessions over time. |
| Covers | Each session covers one subject. |
| Contains | Session notes are created and stored for each session. |
| MarkedFor | Attendance records are created for each student in a session. |
| Present | Students have attendance records across multiple sessions. |
| Verified | Teachers can verify/approve attendance marked by students. |

### Quiz System

| Relationship | Description |
|--------------|-------------|
| Has | Teachers can create multiple quizzes per session. |
| Created | Tracks which teacher created each quiz. |
| BelongsTo | Quizzes contain multiple questions. |
| Attempts | Students can attempt the same quiz multiple times. |
| For | Links attempts to specific quizzes. |
| Answered | Each attempt contains answers to all questions. |
| Questions | Links answered questions back to their original form. |

### Grades

| Relationship | Description |
|--------------|-------------|
| HasGrade | Students receive grades for various assessments. |
| Given | Teachers assign grades to students. |
| ForSubject | Grades are specific to a subject. |
| InSession | Grades can be associated with specific class sessions. |

### Notes & Resources

| Relationship | Description |
|--------------|-------------|
| HasFor | Classes have access to centralized notes. |
| About | Notes are categorized by subject. |
| Related | Notes can be linked to specific sessions. |
| Uploaded | Teachers upload and manage notes. |
| ForNote / Accesses | Tracks which students accessed which notes. |

### Support & Communication

| Relationship | Description |
|--------------|-------------|
| Created | Students/teachers create support tickets. |
| Assigned | Admins are assigned tickets to resolve. |
| BelongsTo | Tickets can be scoped to specific classes. |
| Has | Tickets can have multiple reply exchanges. |
| Responded | Tracks which user replied to a ticket. |
| Posted | Teachers/Admins post announcements to classes. |
| Targets | Announcements are targeted to specific classes. |
| Notifies | System generates notifications for users. |

### Analytics & Insights

| Relationship | Description |
|--------------|-------------|
| Generated | AI generates insights for teachers based on sessions. |
| About | Insights can be about specific sessions or subjects. |
| ActedOn | Teachers can acknowledge/act on insights. |
| Logged | All user actions are logged for security auditing. |

---

## Key Business Rules

1. **Attendance Rule**: A student can only mark attendance once per session. Duplicate attempts are rejected.

2. **Quiz Attempt Rule**: Students can attempt the same quiz multiple times, but only the latest attempt counts toward grades.

3. **Grade Uniqueness**: Each student can have only one grade per quiz attempt.

4. **Session Code Uniqueness**: Each session has a unique 6-digit code that expires after a configurable time.

5. **Class-Subject Binding**: A class can offer the same subject only once per semester.

6. **Ticket Resolution**: Only admins can close/resolve tickets. Students/teachers can only create and reply.

7. **Note Access Tracking**: All note access events are logged for analytics and security.

8. **Idempotency**: Key API operations use idempotency keys to prevent duplicate submissions.
