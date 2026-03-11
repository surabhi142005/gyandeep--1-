# Gyandeep Database Design (Simplified)

Serverless-first data model on MongoDB Atlas with all entities connected; no stray/legacy tables.

## Collections and Relationships

- **users**
  - Roles: `student`, `teacher`, `admin`
  - Links: `classId`, authored `announcements`, `centralized_notes`, `tickets`, `ticket_replies`, `quiz_attempts`, `grades`, `teacher_insights`

- **classes**
  - Fields: `name`
  - Links: `students` (users.classId), `timetable_entries.classId`, `centralized_notes.classId`, `announcements.classId`, `class_sessions.classId`

- **timetable_entries**
  - Fields: `classId`, `day`, `startTime`, `endTime`, `subject`, `teacherId`
  - Drives class schedule; referenced when creating class sessions.

- **class_sessions**
  - Fields: `classId`, `subjectId`, `teacherId`, `code`, `expiry`, `endedAt`
  - Links: `attendance`, `quizzes`, `quiz_attempts`, `centralized_notes` (session context), `teacher_insights`

- **attendance**
  - Fields: `sessionId`, `studentId`, `status`

- **centralized_notes**
  - Fields: `classId`, `subjectId`, `sessionId?`, `unitNumber`, `unitName`, `title`, `content`, `teacherId`
  - Uploaded by teachers; readable by enrolled students.

- **announcements**
  - Fields: `classId`, `authorId`, `title`, `body`

- **quizzes**
  - Fields: `sessionId`, `teacherId`, `quizType` (`pre`|`main`|`post`), `published`
  - Links: `quiz_questions`, `quiz_attempts`

- **quiz_questions**
  - Fields: `quizId`, `question`, `options[]`, `correctAnswer`, `orderIndex`

- **quiz_attempts**
  - Fields: `quizId`, `studentId`, `answersJson`, `attemptNumber`, `startedAt`, `submittedAt`, `timeTakenSeconds`, `percentage`
  - Links: `attempt_answers`, `gradeId`

- **attempt_answers**
  - Fields: `attemptId`, `questionId`, `answerGiven`, `isCorrect`, `marksAwarded`

- **grades**
  - Fields: `studentId`, `quizAttemptId?`, `sessionId?`, `subjectId`, `score`, `maxScore`

- **teacher_insights**
  - Fields: `sessionId`, `teacherId`, `insight`, `actedById?`

- **tickets**
  - Fields: `userId`, `subject`, `message`, `status`, `priority`, `assignedToId?`
  - Links: `ticket_replies`

- **ticket_replies**
  - Fields: `ticketId`, `userId`, `message`

- **notifications**
  - Fields: `userId`, `type`, `title`, `message`, `relatedId`, `read`

- **idempotency_keys / audit_logs**
  - Platform safety/support.

## Index Essentials
- `users.email`, `users.role`, `users.classId`
- `class_sessions.code`, `class_sessions.teacherId`, `class_sessions.classId`
- `quizzes.sessionId`, `quizzes.quizType`
- `quiz_attempts.quizId+studentId+attemptNumber` unique
- `attempt_answers.attemptId+questionId` unique
- `tickets.status`, `tickets.assignedToId`, `tickets.priority`
- `notifications.userId+read`

## Storage
Uploaded files (notes, session uploads) live in cloud object storage (S3/R2-compatible). Only metadata and extracted text are stored in MongoDB.

## Data Integrity Rules
- `users.classId` must exist in `classes`
- `class_sessions.teacherId` must be a teacher user; `class_sessions.classId` must exist in `classes`
- `quizzes.sessionId` must exist; `quiz_questions.quizId` must exist; `quiz_attempts.quizId` must exist
- `grades.studentId` must exist; if `quizAttemptId` present it must exist and belong to the same student
- `tickets.assignedToId` must be a teacher/admin when present

## Cardinality Snapshot
- CLASS 1—N CLASS_SESSION
- CLASS_SESSION 1—N ATTENDANCE
- CLASS_SESSION 1—N QUIZ
- QUIZ 1—N QUIZ_QUESTION
- QUIZ 1—N QUIZ_ATTEMPT
- QUIZ_ATTEMPT 1—N ATTEMPT_ANSWER
- QUIZ_ATTEMPT 0..1—1 GRADE
- CLASS 1—N CENTRALIZED_NOTE
- CLASS 1—N ANNOUNCEMENT
- USER 1—N TICKET; TICKET 1—N TICKET_REPLY

## Serverless Fit
All writes/read are single-collection operations with indexed lookups; no cross-collection transactions required, keeping cold-start friendly and suitable for Vercel/Cloud Functions. Files stay off the VM in cloud storage.***
