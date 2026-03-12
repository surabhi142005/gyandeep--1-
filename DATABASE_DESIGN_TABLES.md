# Gyandeep Data Tables (Mongo Collections)

Summary of the active collections and critical fields (MongoDB Atlas, serverless).

| Collection | Key Fields | Notes |
|------------|------------|-------|
| users | _id, email, role, classId, faceImage, preferences | Roles: student, teacher, admin. |
| classes | _id, name | Linked by users.classId, class_sessions.classId, notes, announcements. |
| timetable_entries | classId, subject, teacherId, day, startTime, endTime | Used when creating sessions. |
| class_sessions | classId, subjectId, teacherId, code, expiry, endedAt?, timetableEntryId? | Links attendance, quizzes, session notes, insights. |
| session_notes | sessionId, content, extractedText, filePath?, deletedAt? | Temporary (session-scoped). |
| centralized_notes | classId?, subjectId, sessionId?, unitNumber, unitName, title, content, noteType | Persistent notes library. |
| quizzes | sessionId, teacherId, quizType (pre/main/post), published, questionsJson | One quiz per session in UI today. |
| quiz_attempts | quizId, studentId, answersJson, attemptNumber, startedAt, submittedAt, timeTakenSeconds, percentage | Links to grades/attempt_answers. |
| attempt_answers | attemptId, questionId, answerGiven, isCorrect, marksAwarded | Per-question storage. |
| grades | studentId, subjectId, sessionId?, quizAttemptId?, score, maxScore | Created after quiz grading. |
| attendance | sessionId, studentId, status | Geofenced + face-verified attendance. |
| announcements | classId, authorId, title, body | Class-scoped posts. |
| tickets | userId, subject, message, status, priority, assignedToId? | Students/teachers create; admins reply/assign/close. |
| ticket_replies | ticketId, userId, message | Linked to tickets. |
| notifications | userId, type, title, message, relatedId?, relatedType?, read | For quiz publish, grades, tickets, etc. |
| teacher_insights | sessionId, teacherId, insight, actedById? | Generated analytics. |
| idempotency_keys, audit_logs | Platform safety/support. |

All file binaries live in cloud object storage; Mongo stores metadata and extracted text only.
