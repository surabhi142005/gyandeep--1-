# Algorithm Design (Simplified, Serverless)

All steps assume MongoDB Atlas + cloud object storage; no local DB/state.

## 1) Enroll Student to Class
1. Auth student.
2. PATCH `users/{id}` set `classId`.
3. Return class snapshot (announcements, timetable, notes).

## 2) Create Class Session (Teacher)
1. Auth teacher.
2. Input: `classId`, `subjectId`, `duration`, optional `timetableEntryId`.
3. Generate join `code`; set `expiry`.
4. INSERT `class_sessions`.
5. Notify students in class (notification docs).

## 3) Attendance
1. Student joins with `code` → fetch session by `code`.
2. Teacher marks or auto-mark: UPSERT `attendance {sessionId, studentId, status}`.

## 4) Notes
1. Teacher uploads file/text.
2. Store file in bucket; extract text (LLM/OCR if image); INSERT `centralized_notes` with URL + text.
3. Optionally link `sessionId` for session-scoped notes.

## 5) Quiz Lifecycle
1. Teacher generates quiz from session notes → INSERT `quizzes` + `quiz_questions` (type `pre|main|post`).
2. Publish: set `published=true`; notify class.
3. Student starts quiz: INSERT `quiz_attempt` (attemptNumber = last+1, startedAt).
4. Submit: grade answers locally; UPDATE attempt with scores/time; INSERT `attempt_answers`; optionally create `grade`.

## 6) Grading
1. Teacher posts grade (often via quiz attempt).
2. INSERT `grades {studentId, sessionId?, quizAttemptId?, score, maxScore}`.
3. Notify student.

## 7) Tickets
1. Any user opens ticket (priority default medium).
2. Admin/teacher assigns → set `assignedToId`; notify assignee.
3. Replies: INSERT `ticket_replies`; bump ticket version/updatedAt; notify owner.

## 8) Announcements
1. Teacher/Admin posts to class → INSERT `announcements`.
2. Notify class users.

## 9) Insights
1. Background job reads session outcomes/attendance.
2. Generates `teacher_insights` per session/teacher; optional `actedById` when followed up.

## 10) Clean Up / Integrity
- Enforce IDs on insert (class/session/quiz/attempt links).
- Idempotency key wrapper for create actions (tickets, grades, quizzes).

## Performance Notes
- All read patterns use indexed fields listed in DATABASE_DESIGN.md.
- Keep payloads <1MB; files stream to storage; only text snippets stored for search.
