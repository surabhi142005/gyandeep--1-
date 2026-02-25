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

const router = Router()

function requireLLM(req, res, next) {
  if (!getLLMService()) return res.status(503).json({ error: 'AI features unavailable. Set GEMINI_API_KEY in environment.' })
  next()
}

// ── Synchronous quiz generation (cached) ─────────────────────────────────────
router.post('/', aiRateLimit, requireAuth, ensureRole('teacher', 'admin'), requireLLM, asyncRoute(async (req, res) => {
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
router.post('/async', aiRateLimit, requireAuth, ensureRole('teacher', 'admin'), requireLLM, asyncRoute(async (req, res) => {
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

export default router
