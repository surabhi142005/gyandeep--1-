# Gyandeep Database Design

## A. Introduction

The Gyandeep Database Design document outlines the complete data structure for the Gyandeep educational platform. This database serves as the backbone for all platform operations, including student management, class sessions, attendance tracking, quiz systems, grade management, and communication features.

The system uses **MongoDB Atlas** as its primary database, deployed in a serverless configuration for scalability and cost efficiency. All data is stored in collections (equivalent to tables in relational databases) with proper indexing for optimal query performance.

### Design Principles

1. **Normalization**: Data is organized to minimize redundancy while maintaining efficient query patterns
2. **Indexing**: Critical fields are indexed for fast lookups (session codes, user emails, class IDs)
3. **Scalability**: Serverless design allows automatic scaling based on demand
4. **Security**: Sensitive data (face embeddings, passwords) are encrypted or hashed
5. **Auditability**: All significant actions are logged for compliance and debugging

---

## B. Purpose and Scope

### Purpose

The Gyandeep database is designed to:

- **Manage Users**: Store student, teacher, and administrator profiles with role-based access
- **Track Attendance**: Record geofenced and face-verified attendance for class sessions
- **Conduct Quizzes**: Support AI-generated quizzes with multiple attempts and auto-grading
- **Store Notes**: Maintain both session-scoped and centralized learning materials
- **Record Grades**: Track student performance across subjects and assessments
- **Handle Support**: Manage helpdesk tickets with assignment and resolution tracking
- **Enable Communication**: Provide notifications and announcements for class updates
- **Generate Insights**: Store AI-generated teaching insights for educators

### Scope

This database covers:

- **Authentication**: User credentials, session tokens, face embeddings
- **Academic Structure**: Classes, subjects, timetables
- **Session Management**: Active sessions with attendance codes
- **Learning Content**: Notes, quizzes, questions, attempts
- **Assessment**: Grades, scores, performance metrics
- **Support**: Tickets, replies, assignments
- **Communication**: Notifications, announcements

### Out of Scope

- Financial transactions or payment processing
- Third-party API integrations (external services)
- Media file storage (stored in cloud object storage)
- Backup and disaster recovery operations

---

## C. Table Definitions

### 1. users

Stores all platform users (students, teachers, administrators).

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| name | String | User's full name |
| email | String | Unique email address |
| role | String | User role: student, teacher, admin |
| password | String | Hashed password (nullable) |
| googleId | String | Google OAuth ID (nullable) |
| faceImage | String | Base64 face image (nullable) |
| active | Boolean | Account status |
| emailVerified | Boolean | Email verification status |
| preferences | JSON | User preferences and settings |
| history | JSON | Learning history data |
| assignedSubjects | JSON | Teacher's assigned subjects |
| performance | JSON | Performance metrics |
| classId | ObjectId | Enrolled class (students) |
| createdAt | DateTime | Account creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Indexes**: email (unique), googleId (unique), classId

---

### 2. classes

Represents student class/grade groups.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| name | String | Class name (e.g., "Class 10-A") |
| createdAt | DateTime | Creation timestamp |

**Indexes**: name (unique), odId (unique)

---

### 3. subjects

Academic subjects offered in the system.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| name | String | Subject name (e.g., "Mathematics") |
| createdAt | DateTime | Creation timestamp |

**Indexes**: name (unique), odId (unique)

---

### 4. class_subjects

Junction table linking classes to subjects they offer.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| classId | ObjectId | Reference to class |
| subjectId | ObjectId | Reference to subject |
| primaryTeacherId | ObjectId | Primary teacher (nullable) |
| semester | String | Semester identifier |

**Indexes**: classId, subjectId, primaryTeacherId, [classId, subjectId] (unique)

---

### 5. user_subjects

Links teachers to subjects they teach (expertise).

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| userId | ObjectId | Reference to teacher |
| subjectId | ObjectId | Reference to subject |
| certified | Boolean | Certification status |
| assignedDate | DateTime | Assignment timestamp |

**Indexes**: userId, subjectId, [userId, subjectId] (unique)

---

### 6. timetable_entries

Weekly class schedule slots.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| day | String | Day of week (Monday-Sunday) |
| startTime | String | Start time (HH:MM) |
| endTime | String | End time (HH:MM) |
| subjectId | ObjectId | Reference to subject |
| teacherId | ObjectId | Assigned teacher |
| classId | ObjectId | Target class |
| room | String | Room number |
| semester | String | Semester identifier |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Indexes**: [day, startTime], teacherId, classId, subjectId

---

### 7. class_sessions

Active class sessions with attendance codes.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| code | String | 6-digit attendance code |
| teacherId | ObjectId | Session conductor |
| classId | ObjectId | Target class |
| subjectId | ObjectId | Subject being taught |
| expiry | DateTime | Session expiration time |
| endedAt | DateTime | Session end time (nullable) |
| quizPublished | Boolean | Quiz published flag |
| quizQuestions | String | JSON of quiz questions |
| quizPublishedAt | DateTime | Quiz publish timestamp |
| sessionStatus | String | Status: active, ended |
| timetableEntryId | ObjectId | Linked timetable slot |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Indexes**: teacherId, expiry, timetableEntryId, code (unique)

---

### 8. session_notes

Notes created during a specific class session (temporary).

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| sessionId | ObjectId | Reference to session |
| authorId | ObjectId | Note author |
| content | String | Note content |
| filePath | String | File path in storage |
| extractedText | String | Extracted text from file |
| deletedAt | DateTime | Soft delete timestamp |
| createdAt | DateTime | Creation timestamp |

**Indexes**: sessionId

---

### 9. centralized_notes

Persistent learning notes shared with classes.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| classId | ObjectId | Target class |
| subjectId | ObjectId | Subject |
| sessionId | ObjectId | Related session (nullable) |
| unitNumber | Integer | Unit/chapter number |
| unitName | String | Unit/chapter name |
| title | String | Note title |
| content | String | Note content |
| filePath | String | File path in storage |
| noteType | String | Type: class_notes, assignment, etc. |
| teacherId | ObjectId | Uploading teacher |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Indexes**: [subjectId, unitNumber], teacherId

---

### 10. user_note_accesses

Tracks which users accessed which notes.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| userId | ObjectId | User who accessed |
| noteId | ObjectId | Note that was accessed |
| accessedAt | DateTime | Access timestamp |

**Indexes**: userId, noteId

---

### 11. quizzes

Teacher-created quizzes linked to sessions.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| sessionId | ObjectId | Reference to session |
| teacherId | ObjectId | Quiz creator |
| reviewedById | ObjectId | Reviewer (nullable) |
| title | String | Quiz title |
| questionsJson | String | JSON of questions |
| published | Boolean | Publication status |
| publishedAt | DateTime | Publish timestamp |
| quizType | String | Type: pre, main, post |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Indexes**: sessionId, teacherId

---

### 12. quiz_questions

Questions within a quiz.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| quizId | ObjectId | Parent quiz |
| createdById | ObjectId | Question creator |
| question | String | Question text |
| options | String | JSON of options |
| correctAnswer | String | Correct answer |
| difficulty | String | Difficulty level |
| tags | String | Topic tags |
| orderIndex | Integer | Display order |

**Indexes**: quizId

---

### 13. quiz_attempts

Student attempts at quizzes.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| quizId | ObjectId | Quiz attempted |
| studentId | ObjectId | Student who attempted |
| reviewedById | ObjectId | Reviewer (nullable) |
| answersJson | String | JSON of answers |
| correctCount | Integer | Correct answers count |
| totalQuestions | Integer | Total questions |
| percentage | Float | Score percentage |
| attemptNumber | Integer | Attempt sequence number |
| startedAt | DateTime | Start timestamp |
| submittedAt | DateTime | Submission timestamp |
| timeTakenSeconds | Integer | Time taken |

**Indexes**: [quizId, studentId, attemptNumber] (unique), studentId, quizId

---

### 14. attempt_answers

Individual answers within a quiz attempt.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| attemptId | ObjectId | Parent attempt |
| questionId | ObjectId | Question answered |
| answerGiven | String | Student's answer |
| isCorrect | Boolean | Correctness flag |
| marksAwarded | Float | Marks scored |

**Indexes**: [attemptId, questionId] (unique), attemptId, questionId

---

### 15. quiz_submissions

Simplified submission tracking (legacy).

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| sessionId | ObjectId | Session |
| studentId | ObjectId | Student |
| answersJson | String | JSON of answers |
| correctCount | Integer | Correct count |
| totalQuestions | Integer | Total questions |
| percentage | Float | Score percentage |
| submittedAt | DateTime | Submission timestamp |

**Indexes**: [sessionId, studentId] (unique), studentId

---

### 16. attendance

Student attendance records for sessions.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| sessionId | ObjectId | Session attended |
| studentId | ObjectId | Student |
| verifiedById | ObjectId | Verifier teacher |
| status | String | Status: present, absent, late |
| markedAt | DateTime | Marking timestamp |
| verifiedAt | DateTime | Verification timestamp |

**Indexes**: [sessionId, studentId] (unique), sessionId, studentId

---

### 17. grades

Student grades for assessments.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| studentId | ObjectId | Student graded |
| subjectId | ObjectId | Subject |
| category | String | Category: quiz, exam, homework |
| title | String | Assessment title |
| score | Float | Score obtained |
| maxScore | Float | Maximum score |
| weight | Float | Weight in final grade |
| date | String | Assessment date |
| teacherId | ObjectId | Grading teacher |
| sessionId | ObjectId | Related session |
| quizAttemptId | ObjectId | Related quiz attempt |
| gradedAt | DateTime | Grading timestamp |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Indexes**: studentId, teacherId, sessionId, subjectId

---

### 18. tickets

Support tickets created by users.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| userId | ObjectId | Ticket creator |
| assignedToId | ObjectId | Assigned admin |
| classId | ObjectId | Related class |
| userName | String | Creator name |
| subject | String | Ticket subject |
| message | String | Initial message |
| category | String | Category: general, technical, academic |
| priority | String | Priority: low, medium, high |
| status | String | Status: open, in_progress, resolved, closed |
| resolvedAt | DateTime | Resolution timestamp |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| version | Integer | Optimistic locking version |

**Indexes**: status, assignedToId, priority, userId

---

### 19. ticket_replies

Replies to support tickets.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| ticketId | ObjectId | Parent ticket |
| userId | ObjectId | Reply author |
| userName | String | Author name |
| message | String | Reply content |
| createdAt | DateTime | Creation timestamp |

**Indexes**: [ticketId, createdAt]

---

### 20. notifications

User notifications for events.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| userId | ObjectId | Notification recipient |
| type | String | Type: quiz_published, grade_posted, etc. |
| title | String | Notification title |
| message | Notification content |
| relatedId | ObjectId | Related entity ID |
| relatedType | String | Related entity type |
| read | Boolean | Read status |
| readAt | DateTime | Read timestamp |
| createdAt | DateTime | Creation timestamp |

**Indexes**: [userId, read], [userId, createdAt]

---

### 21. announcements

Class-wide announcements.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| authorId | ObjectId | Announcement author |
| classId | ObjectId | Target class |
| subjectId | ObjectId | Related subject (nullable) |
| title | Announcement title |
| content | Announcement body |
| priority | String | Priority: normal, important, urgent |
| expiresAt | Expiration timestamp |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Indexes**: classId, authorId

---

### 22. teacher_insights

AI-generated insights for teachers.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| teacherId | ObjectId | Teacher receiving insight |
| sessionId | ObjectId | Related session |
| subjectId | ObjectId | Related subject |
| insightText | String | Insight content |
| actedOnById | ObjectId | User who acted on insight |
| generatedAt | DateTime | Generation timestamp |

**Indexes**: teacherId, sessionId

---

### 23. audit_logs

Security audit trail for actions.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| ts | DateTime | Event timestamp |
| type | Event type |
| userId | ObjectId | User who performed action |
| details | JSON | Additional details |

**Indexes**: [userId, ts], ts

---

### 24. idempotency_keys

API idempotency for duplicate prevention.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| key | String | Idempotency key |
| userId | ObjectId | User making request |
| action | String | Action being performed |
| statusCode | Integer | Response status code |
| responseBody | String | Cached response |
| createdAt | DateTime | Creation timestamp |

**Indexes**: createdAt

---

### 25. default_subjects

Default subject list.

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| odId | String | External OpenDentity ID |
| name | String | Subject name |

**Indexes**: name (unique)

---

## Entity Relationship Summary

| Entity | Related Entities |
|--------|------------------|
| users | classes, class_sessions, quizzes, centralized_notes, grades, attendance, tickets, notifications, announcements |
| classes | users, class_sessions, class_subjects, centralized_notes, tickets, announcements |
| subjects | class_subjects, user_subjects, class_sessions, centralized_notes, grades, announcements |
| class_sessions | users, classes, subjects, session_notes, quizzes, attendance, grades, centralized_notes, teacher_insights |
| quizzes | class_sessions, users, quiz_questions, quiz_attempts |
| quiz_attempts | users, quizzes, grades, attempt_answers |
| attendance | class_sessions, users |
| grades | users, subjects, class_sessions, quiz_attempts |
| tickets | users, classes, ticket_replies |
| notifications | users |
| announcements | users, classes, subjects |
| teacher_insights | users, class_sessions, subjects |
