# Gyandeep Algorithm Design

## Overview
This document describes the core algorithms used in the Gyandeep educational platform, including attendance verification, quiz generation, face recognition, performance scoring, and session management.

---

## 1. Attendance Verification Algorithm

### Purpose
Verify student attendance using geofencing and facial recognition to prevent proxy attendance.

### Algorithm: Geofenced Attendance with Face Verification

```
ALGORITHM: VerifyAttendance(studentId, classSessionId, location, faceImage)

INPUT:
  - studentId: string
  - classSessionId: string
  - location: { latitude: number, longitude: number }
  - faceImage: Base64 string

OUTPUT: { success: boolean, message: string, attendanceId: string | null }

1. FETCH classSession FROM class_sessions WHERE _id = classSessionId
   IF NOT FOUND:
     RETURN { success: false, message: "Invalid session", attendanceId: null }

2. IF classSession.endedAt EXISTS:
     RETURN { success: false, message: "Session ended", attendanceId: null }

3. IF currentTime > classSession.expiresAt:
     RETURN { success: false, message: "Session expired", attendanceId: null }

4. IF classSession.geoEnabled IS true:
     a. LET sessionLocation = classSession.centerPoint
     b. LET radius = classSession.radiusMeters
     c. LET distance = HaversineDistance(location, sessionLocation)
     d. IF distance > radius:
          RETURN { success: false, message: "Outside attendance zone", attendanceId: null }

5. IF classSession.faceEnabled IS true:
     a. LET student = FETCH users WHERE _id = studentId
     b. IF student.faceEmbedding IS NULL:
          RETURN { success: false, message: "Face not registered", attendanceId: null }
     c. LET faceMatch = CALL FaceVerify(faceImage, student.faceEmbedding)
     d. IF faceMatch.confidence < 0.85:
          RETURN { success: false, message: "Face verification failed", attendanceId: null }

6. LET existingAttendance = FIND attendance WHERE 
     studentId = studentId AND classSessionId = classSessionId

7. IF existingAttendance EXISTS:
     IF existingAttendance.status = "present":
       RETURN { success: true, message: "Already marked", attendanceId: existingAttendance._id }
     ELSE:
       UPDATE existingAttendance SET status = "present", verifiedAt = NOW()

8. LET attendanceRecord = INSERT INTO attendance:
     {
       studentId,
       classSessionId,
       status: "present",
       location,
       verifiedAt: NOW(),
       faceVerified: classSession.faceEnabled,
       deviceInfo: GET DeviceInfo()
     }

9. RETURN { success: true, message: "Attendance marked", attendanceId: attendanceRecord._id }
```

### Helper: Haversine Distance Calculation

```
FUNCTION HaversineDistance(point1, point2)
  LET R = 6371000  // Earth radius in meters
  LET lat1 = point1.latitude * π/180
  LET lat2 = point2.latitude * π/180
  LET Δlat = (point2.latitude - point1.latitude) * π/180
  LET Δlon = (point2.longitude - point1.longitude) * π/180

  LET a = sin(Δlat/2)² + cos(lat1) * cos(lat2) * sin(Δlon/2)²
  LET c = 2 * atan2(√a, √(1-a))

  RETURN R * c
```

---

## 2. AI Quiz Generation Algorithm

### Purpose
Automatically generate quizzes from educational content using Google Gemini AI.

### Algorithm: Gemini-Powered Quiz Generation

```
ALGORITHM: GenerateQuiz(topic, gradeLevel, numQuestions, quizType)

INPUT:
  - topic: string (subject/topic name)
  - gradeLevel: string (e.g., "Class 10")
  - numQuestions: integer (default: 10)
  - quizType: "pre" | "main" | "post"

OUTPUT: { questions: Question[], quizId: string }

1. LET systemPrompt = BUILDQuizSystemPrompt(gradeLevel, quizType)
2. LET userPrompt = BUILDQuizUserPrompt(topic, numQuestions)

3. LET geminiResponse = CALL GeminiAPI(systemPrompt, userPrompt)

4. LET parsedQuestions = PARSE GeminiResponse(geminiResponse)
   IF PARSE FAILED:
     RETURN { error: "Failed to generate valid questions" }

5. FOR EACH question IN parsedQuestions:
   a. question.quizType = quizType
   b. question.difficulty = CALCULATEDifficulty(question, gradeLevel)
   c. question.tags = EXTRACTTags(topic, question.content)
   d. FOR EACH option IN question.options:
        option.isCorrect = NORMALIZEBoolean(option.isCorrect)

6. LET quiz = INSERT INTO quizzes:
     {
       topic,
       gradeLevel,
       quizType,
       questions: parsedQuestions,
       createdBy: "AI",
       createdAt: NOW(),
       timeLimit: CALCULATETimeLimit(numQuestions, quizType)
     }

7. RETURN { questions: parsedQuestions, quizId: quiz._id }
```

### Helper: Quiz Scoring Algorithm

```
ALGORITHM: CalculateQuizScore(quizId, attemptId)

INPUT:
  - quizId: string
  - attemptId: string

OUTPUT: { score: number, total: number, percentage: number, grade: string }

1. LET attempt = FETCH quiz_attempts WHERE _id = attemptId
2. LET quiz = FETCH quizzes WHERE _id = quizId

3. LET correct = 0
4. LET total = quiz.questions.length

5. FOR EACH answer IN attempt.answers:
   a. LET question = FIND quiz.questions WHERE _id = answer.questionId
   b. IF question.correctAnswer = answer.selectedAnswer:
        correct++

6. LET percentage = (correct / total) * 100

7. LET grade = SWITCH percentage:
     CASE >= 90: "A+"
     CASE >= 80: "A"
     CASE >= 70: "B+"
     CASE >= 60: "B"
     CASE >= 50: "C"
     CASE >= 40: "D"
     DEFAULT: "F"

8. UPDATE quiz_attempts SET score = correct, percentage = percentage, grade = grade

9. RETURN { score: correct, total: total, percentage: percentage, grade: grade }
```

---

## 3. Face Recognition Algorithm

### Purpose
Register and verify student faces for authentication and attendance.

### Algorithm: Face Registration Flow

```
ALGORITHM: RegisterFace(studentId, imageData)

INPUT:
  - studentId: string
  - imageData: Base64 string

OUTPUT: { success: boolean, message: string, embeddingId: string | null }

1. LET image = DECODEBase64(imageData)

2. LET faceDetection = CALL FaceDetect(image)
   IF faceDetection.count == 0:
     RETURN { success: false, message: "No face detected", embeddingId: null }
   IF faceDetection.count > 1:
     RETURN { success: false, message: "Multiple faces detected", embeddingId: null }

3. LET landmarks = CALL FaceLandmarks(faceDetection.face)

4. LET quality = ASSESSImageQuality(image, landmarks)
   IF quality.score < 0.7:
     RETURN { success: false, message: "Image quality too low", embeddingId: null }

5. LET embedding = CALL FaceEmbedding(faceDetection.face)

6. LET existingEmbedding = FIND face_embeddings WHERE studentId = studentId
   IF existingEmbedding EXISTS:
     UPDATE face_embeddings SET embedding = embedding, updatedAt = NOW()
   ELSE:
     INSERT INTO face_embeddings { studentId, embedding, createdAt: NOW() }

7. RETURN { success: true, message: "Face registered successfully", embeddingId: studentId }
```

### Algorithm: Face Verification for Login

```
ALGORITHM: VerifyFaceForLogin(imageData)

INPUT:
  - imageData: Base64 string

OUTPUT: { success: boolean, user: User | null, confidence: number }

1. LET image = DECODEBase64(imageData)

2. LET faceDetection = CALL FaceDetect(image)
   IF faceDetection.count != 1:
     RETURN { success: false, user: null, confidence: 0 }

3. LET embedding = CALL FaceEmbedding(faceDetection.face)

4. LET candidates = FETCH all face_embeddings

5. LET bestMatch = NULL
6. LET bestScore = 0

7. FOR EACH candidate IN candidates:
   a. LET similarity = COSINE Similarity(embedding, candidate.embedding)
   b. IF similarity > bestScore:
        bestScore = similarity
        bestMatch = candidate

8. IF bestScore >= 0.85:
   LET user = FETCH users WHERE _id = bestMatch.studentId
   RETURN { success: true, user: user, confidence: bestScore }
9. ELSE:
   RETURN { success: false, user: null, confidence: bestScore }
```

---

## 4. Performance Analytics Algorithm

### Purpose
Calculate student performance metrics and generate insights.

### Algorithm: Student Performance Score

```
ALGORITHM: CalculateStudentPerformance(studentId, timeframe)

INPUT:
  - studentId: string
  - timeframe: "week" | "month" | "semester" | "year"

OUTPUT: { overallScore: number, breakdown: PerformanceBreakdown }

1. LET startDate = CALCULATEStartDate(timeframe)

2. LET quizScores = FETCH quiz_attempts WHERE 
     studentId = studentId AND completedAt >= startDate

3. LET attendanceRecords = FETCH attendance WHERE 
     studentId = studentId AND verifiedAt >= startDate

4. LET totalQuizzes = quizScores.length
5. LET avgQuizScore = AVERAGE(quizScores.map(s => s.percentage))

6. LET totalSessions = COUNT class_sessions WHERE startTime >= startDate
7. LET attendedSessions = attendanceRecords.length
8. LET attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0

9. LET engagementScore = CALCULATEEngagementScore(studentId, timeframe)

10. LET weights = { quiz: 0.5, attendance: 0.3, engagement: 0.2 }

11. LET overallScore = 
      (avgQuizScore * weights.quiz) + 
      (attendanceRate * weights.attendance) + 
      (engagementScore * weights.engagement)

12. LET breakdown = {
      quizPerformance: { average: avgQuizScore, total: totalQuizzes },
      attendanceRate: attendanceRate,
      engagementScore: engagementScore,
      trend: CALCULATETrend(studentId, timeframe)
    }

13. RETURN { overallScore: Math.round(overallScore), breakdown }
```

### Algorithm: Engagement Score Calculation

```
ALGORITHM: CalculateEngagementScore(studentId, timeframe)

INPUT:
  - studentId: string
  - timeframe: string

OUTPUT: number (0-100)

1. LET activities = FETCH all student activities WHERE timestamp >= startDate

2. LET metrics = {
      resourceAccess: COUNT unique resources accessed,
      noteViews: COUNT notes viewed,
      quizAttempts: COUNT quizzes attempted,
      chatMessages: COUNT chatbot interactions,
      timeSpent: SUM time spent on platform
    }

3. LET normalizedMetrics = {
      resourceAccess: NORMALIZE(metrics.resourceAccess, 0, 50),
      noteViews: NORMALIZE(metrics.noteViews, 0, 100),
      quizAttempts: NORMALIZE(metrics.quizAttempts, 0, 20),
      chatMessages: NORMALIZE(metrics.chatMessages, 0, 30),
      timeSpent: NORMALIZE(metrics.timeSpent, 0, 3600)
    }

4. LET weights = {
      resourceAccess: 0.2,
      noteViews: 0.2,
      quizAttempts: 0.3,
      chatMessages: 0.1,
      timeSpent: 0.2
    }

5. LET engagementScore = SUM(normalizedMetrics[key] * weights[key]) FOR all keys

6. RETURN Math.min(100, Math.round(engagementScore))
```

---

## 5. Session Management Algorithm

### Purpose
Manage class sessions with secure attendance codes and expiration.

### Algorithm: Class Session Lifecycle

```
ALGORITHM: ManageClassSession(teacherId, action, params)

INPUT:
  - teacherId: string
  - action: "start" | "end" | "extend"
  - params: { classId?, sessionId?, duration? }

OUTPUT: { success: boolean, session: ClassSession | null, message: string }

1. SWITCH action:

   CASE "start":
     a. VERIFY teacherId has permission for params.classId
     b. LET activeSession = FIND class_sessions WHERE 
          classId = params.classId AND endedAt IS NULL
     c. IF activeSession EXISTS:
          RETURN { success: false, session: null, message: "Session already active" }
     
     d. LET sessionCode = GENERATE6DigitCode()
     e. LET expiresAt = NOW() + DEFAULT_DURATION (typically 30 minutes)
     
     f. LET session = INSERT INTO class_sessions:
          {
            classId: params.classId,
            teacherId,
            code: sessionCode,
            startedAt: NOW(),
            expiresAt,
            endedAt: null,
            geoEnabled: params.geoEnabled,
            geoRadius: params.geoRadius,
            faceEnabled: params.faceEnabled,
            centerPoint: params.centerPoint
          }
     
     g. RETURN { success: true, session, message: "Session started" }

   CASE "end":
     a. LET session = FETCH class_sessions WHERE _id = params.sessionId
     b. IF session.teacherId != teacherId:
          RETURN { success: false, session: null, message: "Unauthorized" }
     
     c. UPDATE class_sessions SET endedAt = NOW() WHERE _id = params.sessionId
     
     d. LET absentStudents = FIND users WHERE classId = session.classId
        AND _id NOT IN (SELECT studentId FROM attendance WHERE classSessionId = params.sessionId)
     
     e. FOR EACH student IN absentStudents:
        INSERT INTO attendance { studentId: student._id, classSessionId: session._id, status: "absent" }
     
     f. RETURN { success: true, session, message: "Session ended" }

   CASE "extend":
     a. LET session = FETCH class_sessions WHERE _id = params.sessionId
     b. IF session.teacherId != teacherId:
          RETURN { success: false, session: null, message: "Unauthorized" }
     
     c. LET newExpiresAt = session.expiresAt + params.duration
     d. UPDATE class_sessions SET expiresAt = newExpiresAt WHERE _id = params.sessionId
     
     e. RETURN { success: true, session: updatedSession, message: "Session extended" }
```

---

## 6. Gamification Algorithm

### Purpose
Calculate XP, levels, badges, and leaderboard rankings.

### Algorithm: XP and Level Calculation

```
ALGORITHM: AwardXP(userId, activityType, activityData)

INPUT:
  - userId: string
  - activityType: "quiz" | "attendance" | "note_share" | "help_peer"
  - activityData: object

OUTPUT: { xpAwarded: number, newLevel: number, newTotalXP: number }

1. LET xpRules = {
      quiz: { base: 50, bonus: (score) => score * 0.5 },
      attendance: { base: 10, streak: (days) => days * 2 },
      note_share: { base: 20, views: (count) => count * 1 },
      help_peer: { base: 15, accepted: (count) => count * 5 }
    }

2. LET xpEarned = xpRules[activityType].base

3. SWITCH activityType:
   CASE "quiz":
     xpEarned += xpRules[activityType].bonus(activityData.score)
   CASE "attendance":
     xpEarned += xpRules[activityType].streak(activityData.streakDays)
   CASE "note_share":
     xpEarned += xpRules[activityType].views(activityData.viewCount)
   CASE "help_peer":
     xpEarned += xpRules[activityType].accepted(activityData.acceptedAnswers)

4. LET user = FETCH users WHERE _id = userId
5. LET newTotalXP = user.totalXP + xpEarned
6. LET newLevel = CALCULATELevel(newTotalXP)

7. UPDATE users SET totalXP = newTotalXP, level = newLevel

8. CHECKBadgeUnlocks(userId)

9. RETURN { xpAwarded: xpEarned, newLevel, newTotalXP }
```

### Algorithm: Leaderboard Ranking

```
ALGORITHM: GetLeaderboard(classId, timeframe)

INPUT:
  - classId: string (optional, null for global)
  - timeframe: "daily" | "weekly" | "monthly" | "all_time"

OUTPUT: { rankings: UserRank[], lastUpdated: timestamp }

1. LET startDate = CALCULATEStartDate(timeframe)

2. IF classId IS NOT NULL:
   LET users = FIND users WHERE classId = classId
3. ELSE:
   LET users = FIND all users

3. FOR EACH user IN users:
   a. LET xpData = FETCH xp_records WHERE userId = user._id AND timestamp >= startDate
   b. user.periodXP = SUM(xpData.amount)
   c. user.totalXP = user.totalXP (from user record)
   d. user.quizScore = AVERAGE quiz_attempts WHERE userId = user._id AND completedAt >= startDate
   e. user.attendanceRate = CALCULATEAttendanceRate(user._id, startDate)

4. LET sortedBy = timeframe == "all_time" ? "totalXP" : "periodXP"

5. LET rankings = SORT users BY [sortedBy DESC, quizScore DESC, attendanceRate DESC]

6. FOR rank = 0 TO rankings.length:
   rankings[rank].rank = rank + 1

7. RETURN { rankings, lastUpdated: NOW() }
```

---

## 7. Search Algorithm

### Purpose
Provide intelligent search across notes, quizzes, and resources.

### Algorithm: Intelligent Search

```
ALGORITHM: SearchContent(query, filters, userId)

INPUT:
  - query: string
  - filters: { type?, subject?, dateRange?, classId? }
  - userId: string

OUTPUT: { results: SearchResult[], total: number }

1. LET searchTerms = TOKENIZEAndSTEM(query)

2. LET mongoQuery = BUILD MongoQuery(searchTerms, filters)

3. LET notesResults = SEARCH centralized_notes WITH mongoQuery
4. LET quizResults = SEARCH quizzes WITH mongoQuery
5. LET announcementResults = SEARCH announcements WITH mongoQuery

6. LET user = FETCH users WHERE _id = userId
7. LET accessibleClasses = GETAccessibleClasses(user)

8. FILTER results TO only include content from accessibleClasses

9. FOR EACH result IN combinedResults:
   a. result.relevanceScore = CALCULATERelevance(result, searchTerms)
   b. result.highlights = GENERATEHighlights(result, searchTerms)

10. LET finalResults = SORT combinedResults BY relevanceScore DESC

11. RETURN { results: finalResults, total: finalResults.length }
```

---

## Summary

| Algorithm | Purpose | Key Operations |
|-----------|---------|----------------|
| Attendance Verification | Geofence + Face auth | Haversine distance, face embedding similarity |
| Quiz Generation | AI-powered quiz creation | Gemini API, parsing, difficulty calculation |
| Face Recognition | Registration + Login | Face detection, embedding, cosine similarity |
| Performance Analytics | Student metrics | Weighted scoring, normalization, trend analysis |
| Session Management | Class session lifecycle | Code generation, expiration, auto-marking |
| Gamification | XP, levels, rankings | XP rules, level curves, badge checks |
| Search | Content discovery | Tokenization, relevance scoring, highlighting |
