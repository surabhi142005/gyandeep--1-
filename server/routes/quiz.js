/**
 * server/routes/quiz.js — Quiz generation routes
 *
 * POST /api/quiz          — synchronous quiz generation (with cache + circuit breaker)
 * POST /api/quiz/async    — fire-and-forget job (returns jobId)
 * POST /api/summarize     — summarise notes
 * POST /api/auto-grade    — AI auto-grading
 * POST /api/analytics/insights — AI analytics
 */

import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { ensureRole } from '../middleware/rbac.js'
import { aiRateLimit } from '../middleware/rateLimiter.js'
import { asyncRoute } from '../middleware/validate.js'
import { getLLMService } from '../services/llmService.js'
import { hashNotes, getCachedQuiz, cacheQuiz } from '../services/redisService.js'
import { addJob } from '../jobQueue.js'
import { mongoOps, COLLECTIONS, generateId, getDB } from '../db/mongo.js'

const router = Router()

function requireLLM(req, res, next) {
  if (!getLLMService()) return res.status(503).json({ error: 'AI features unavailable. Set GEMINI_API_KEY in environment.' })
  next()
}

// ── Synchronous quiz generation (cached) ─────────────────────────────────────
router.post('/', aiRateLimit, requireAuth, ensureRole('teacher'), requireLLM, asyncRoute(async (req, res) => {
  const { notesText, subject, enableThinkingMode } = req.body || {}
  if (!notesText || !subject) return res.status(400).json({ error: 'notesText and subject are required' })

  // Check quiz cache first (saves ~30-50% of Gemini calls)
  const notesHash = hashNotes(String(notesText))
  const cached = await getCachedQuiz(notesHash, subject)
  if (cached) {
    return res.json({ quiz: cached, fromCache: true })
  }

  const llm = getLLMService()
  const quiz = await llm.generateQuiz(String(notesText), String(subject), {
    thinkingMode: !!enableThinkingMode,
  })

  // Cache the result for future identical notes
  await cacheQuiz(notesHash, subject, quiz)
  return res.json({ quiz, fromCache: false })
}))

// ── Async quiz generation (fire-and-forget) ───────────────────────────────────
router.post('/async', aiRateLimit, requireAuth, ensureRole('teacher'), requireLLM, asyncRoute(async (req, res) => {
  const { notesText, subject } = req.body || {}
  if (!notesText || !subject) return res.status(400).json({ error: 'notesText and subject are required' })
  const notesHash = hashNotes(String(notesText))
  const job = await addJob('quiz-generation', { notesText, subject, notesHash })
  return res.json({ ok: true, jobId: job.id, notesHash })
}))

// ── Summarise notes ───────────────────────────────────────────────────────────
router.post('/summarize', aiRateLimit, requireAuth, requireLLM, asyncRoute(async (req, res) => {
  const { text, mode, subject } = req.body || {}
  if (!text) return res.status(400).json({ error: 'text is required' })
  const llm = getLLMService()
  const result = await llm.summarize(String(text), mode || 'bullets', subject || '')
  return res.json(result)
}))

// ── Auto-grade ────────────────────────────────────────────────────────────────
router.post('/auto-grade', aiRateLimit, requireAuth, ensureRole('teacher', 'admin'), requireLLM, asyncRoute(async (req, res) => {
  const { question, studentAnswer, rubric, subject, maxScore = 10 } = req.body || {}
  if (!question || !studentAnswer) return res.status(400).json({ error: 'question and studentAnswer are required' })
  const llm = getLLMService()
  const result = await llm.autoGrade(String(question), String(studentAnswer), rubric, Number(maxScore), subject || '')
  return res.json(result)
}))

// ── Analytics insights ────────────────────────────────────────────────────────
router.post('/analytics/insights', aiRateLimit, requireAuth, ensureRole('teacher', 'admin'), requireLLM, asyncRoute(async (req, res) => {
  const { studentData, type } = req.body || {}
  if (!studentData) return res.status(400).json({ error: 'studentData required' })
  const llm = getLLMService()
  const result = await llm.analyticsInsights(studentData, type || 'general')
  return res.json(result)
}))

// â”€â”€ Get quizzes for a session (supports 1:N) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/by-session/:sessionId', requireAuth, asyncRoute(async (req, res) => {
  const { quizType } = req.query
  const filter = { session_id: req.params.sessionId }
  if (quizType) filter.quiz_type = String(quizType)

  const quizzes = await getDB()
    .collection(COLLECTIONS.QUIZZES)
    .find(filter)
    .sort({ created_at: -1 })
    .toArray()

  return res.json(quizzes.map(q => ({
    id: q._id?.toString?.() || q.id,
    sessionId: q.session_id,
    quizType: q.quiz_type || 'main',
    title: q.title,
    published: !!q.published,
    publishedAt: q.published_at,
    questions: q.questions_json ? JSON.parse(q.questions_json) : [],
  })))
}))

// â”€â”€ Start a quiz attempt (records startedAt) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/:id/start', requireAuth, ensureRole('student'), asyncRoute(async (req, res) => {
  const quizId = req.params.id
  const quiz = await mongoOps.findOne(COLLECTIONS.QUIZZES, { _id: quizId }) ||
    await mongoOps.findOne(COLLECTIONS.QUIZZES, { id: quizId }) ||
    await mongoOps.findOne(COLLECTIONS.QUIZZES, { odId: quizId })
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' })

  const db = getDB()
  const lastAttempt = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS)
    .find({ quiz_id: quiz._id || quizId, student_id: req.user.id })
    .sort({ attempt_number: -1 })
    .limit(1)
    .toArray()
  const nextAttempt = lastAttempt[0]?.attempt_number ? Number(lastAttempt[0].attempt_number) + 1 : 1

  const startedAt = Date.now()
  const attempt = {
    _id: generateId(),
    quiz_id: quiz._id || quizId,
    student_id: req.user.id,
    answers_json: '[]',
    correct_count: 0,
    total_questions: 0,
    percentage: 0,
    attempt_number: nextAttempt,
    started_at: startedAt,
    submitted_at: null,
    time_taken_seconds: null,
  }

  await mongoOps.insertOne(COLLECTIONS.QUIZ_ATTEMPTS, attempt)
  return res.json({ ok: true, attemptId: attempt._id, attemptNumber: nextAttempt, startedAt })
}))

// â”€â”€ Submit quiz attempt (stores answers + time taken) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/:id/submit', requireAuth, ensureRole('student'), asyncRoute(async (req, res) => {
  const quizId = req.params.id
  const { answers, startedAt } = req.body || {}
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers array is required' })

  const quiz = await mongoOps.findOne(COLLECTIONS.QUIZZES, { _id: quizId }) ||
    await mongoOps.findOne(COLLECTIONS.QUIZZES, { id: quizId }) ||
    await mongoOps.findOne(COLLECTIONS.QUIZZES, { odId: quizId })
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' })

  const questions = quiz.questions_json ? JSON.parse(quiz.questions_json) : []
  const submittedAt = Date.now()

  const db = getDB()
  const openAttempt = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS)
    .find({ quiz_id: quiz._id || quizId, student_id: req.user.id, submitted_at: null })
    .sort({ attempt_number: -1 })
    .limit(1)
    .toArray()

  const existingCount = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS)
    .countDocuments({ quiz_id: quiz._id || quizId, student_id: req.user.id })

  const attemptNumber = openAttempt[0]?.attempt_number || existingCount + 1 || 1
  const attemptId = openAttempt[0]?._id || generateId()
  const effectiveStarted = startedAt ? Number(startedAt) : (openAttempt[0]?.started_at || submittedAt)

  let correctCount = 0
  const gradedAnswers = answers.map((ans, idx) => {
    const question = questions[idx] || {}
    const qId = question.id || question._id || `${quizId}:${idx}`
    const selected = ans?.answer ?? ans?.selectedAnswer ?? ans?.option
    const isCorrect = question && question.correctAnswer !== undefined
      ? selected === question.correctAnswer
      : false
    if (isCorrect) correctCount++
    return {
      questionIndex: idx,
      questionId: qId,
      selectedAnswer: selected,
      isCorrect,
      correctAnswer: question?.correctAnswer,
    }
  })

  const totalQuestions = questions.length || gradedAnswers.length
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  const timeTakenSeconds = Math.max(0, Math.round((submittedAt - effectiveStarted) / 1000))

  const attemptDoc = {
    quiz_id: quiz._id || quizId,
    student_id: req.user.id,
    answers_json: JSON.stringify(gradedAnswers),
    correct_count: correctCount,
    total_questions: totalQuestions,
    percentage,
    attempt_number: attemptNumber,
    started_at: effectiveStarted,
    submitted_at: submittedAt,
    time_taken_seconds: timeTakenSeconds,
  }

  if (openAttempt[0]) {
    await mongoOps.updateOne(
      COLLECTIONS.QUIZ_ATTEMPTS,
      { _id: openAttempt[0]._id },
      { $set: attemptDoc }
    )
  } else {
    await mongoOps.insertOne(COLLECTIONS.QUIZ_ATTEMPTS, { _id: attemptId, ...attemptDoc })
  }

  // Store individual answers
  const answerDocs = gradedAnswers.map(a => ({
    _id: generateId(),
    attempt_id: attemptId,
    question_id: a.questionId,
    answer_given: a.selectedAnswer ?? null,
    is_correct: !!a.isCorrect,
    marks_awarded: a.isCorrect ? 1 : 0,
  }))
  if (answerDocs.length > 0) {
    await mongoOps.insertMany(COLLECTIONS.ATTEMPT_ANSWERS, answerDocs).catch(() => {})
  }

  return res.json({
    ok: true,
    attemptId,
    attemptNumber,
    correctCount,
    totalQuestions,
    percentage,
    timeTakenSeconds,
    answers: gradedAnswers,
  })
}))

export default router
