/**
 * server/services/llmService.js — LLM Adapter Pattern
 *
 * Defines the LLMService interface and a GeminiAdapter implementation.
 * Swap providers by changing LLM_PROVIDER in .env without touching route code.
 *
 * Interface:
 *   generateQuiz(notesText, subject, opts?)  → Promise<Question[]>
 *   chat(prompt, context?, opts?)            → Promise<{ text, sources }>
 *   summarize(text, mode?, subject?)         → Promise<object>
 *   autoGrade(question, answer, rubric, max) → Promise<GradeResult>
 *   analyticsInsights(data, type)            → Promise<object>
 */

import dotenv from 'dotenv'
import { isCircuitOpen, recordFailure, recordSuccess } from './redisService.js'
import { recordAICall } from './metrics.js'

dotenv.config({ path: '../.env.local' })
dotenv.config()

// ─── Gemini Adapter ───────────────────────────────────────────────────────────

class GeminiAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.ai = null
    this.Type = null
  }

  async _init() {
    if (this.ai) return
    const { GoogleGenAI, Type } = await import('@google/genai')
    this.ai = new GoogleGenAI({ apiKey: this.apiKey })
    this.Type = Type
  }

  async _generate(model, contents, config = {}, operation = 'generate') {
    await this._init()
    const CIRCUIT = 'gemini'
    if (await isCircuitOpen(CIRCUIT)) {
      throw new Error('AI service temporarily unavailable (circuit open). Please try again shortly.')
    }
    return recordAICall(operation, async () => {
      try {
        const response = await this.ai.models.generateContent({ model, contents, config })
        await recordSuccess(CIRCUIT)
        return response
      } catch (err) {
        await recordFailure(CIRCUIT)
        throw err
      }
    })
  }

  async generateQuiz(notesText, subject, opts = {}) {
    const { Type } = await import('@google/genai')
    const modelName = opts.thinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash'
    const config = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question:      { type: Type.STRING },
                options:       { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
              },
              required: ['question', 'options', 'correctAnswer'],
            },
          },
        },
        required: ['quiz'],
      },
    }
    if (opts.thinkingMode) {
      config.thinkingConfig = { thinkingBudget: 32768 }
    }
    const response = await this._generate(
      modelName,
      `Based on the following class notes for "${subject}", generate exactly 5 MCQ questions with 4 options each.\n\nNotes:\n---\n${notesText}\n---`,
      config,
      'generateQuiz',
    )
    const parsed = JSON.parse(response.text)
    if (!parsed.quiz?.length) throw new Error('AI returned empty quiz')
    return parsed.quiz.map((q, i) => ({ ...q, id: `q-${Date.now()}-${i}` }))
  }

  async chat(prompt, context = '', opts = {}) {
    const modelName = opts.fast ? 'gemini-flash-lite-latest' : 'gemini-2.5-flash'
    const config = {}
    if (opts.location?.lat) {
      config.tools = [{ googleMaps: {} }]
      config.toolConfig = { retrievalConfig: { latLng: { latitude: opts.location.lat, longitude: opts.location.lng } } }
    }
    const fullPrompt = context
      ? `You are Gyandeep AI, an educational assistant. Use the lesson material below as context when relevant.\n${context}\nUser question: ${prompt}`
      : prompt
    const response = await this._generate(modelName, fullPrompt, config, 'chat')
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    const sources = groundingChunks
      .filter(c => c.maps)
      .flatMap(c => {
        const s = []
        if (c.maps.uri && c.maps.title) s.push({ uri: c.maps.uri, title: c.maps.title })
        return s
      })
      .filter((s, i, arr) => arr.findIndex(x => x.uri === s.uri) === i)
    return { text: response.text, sources }
  }

  async summarize(text, mode = 'bullets', subject = '') {
    const prompt = mode === 'bullets'
      ? `Summarize the following ${subject || 'lesson'} notes into a concise TL;DR (1-2 sentences), then 5 key bullet points, and up to 8 key concepts. Return ONLY valid JSON: {"tldr":"...","highlights":["..."],"concepts":["..."]}\n\nNotes:\n${text.slice(0, 8000)}`
      : `Extract key points from these ${subject || 'lesson'} notes. Return valid JSON only: {"keyPoints":["..."],"summary":"..."}\n\nNotes:\n${text.slice(0, 8000)}`
    const response = await this._generate('gemini-2.5-flash', prompt, { responseMimeType: 'application/json' }, 'summarize')
    try { return JSON.parse(response.text) } catch { return { summary: response.text, keyPoints: [] } }
  }

  async autoGrade(question, studentAnswer, rubric, maxScore = 10, subject = '') {
    const rubricText = rubric
      ? `Grading Rubric:\n${typeof rubric === 'string' ? rubric : JSON.stringify(rubric, null, 2)}`
      : `Award marks based on accuracy, completeness, and clarity. Maximum: ${maxScore}.`
    const prompt = `You are an expert teacher grading a student answer for "${subject || 'General'}".\n\nQuestion: ${question}\nAnswer: ${studentAnswer}\n${rubricText}\n\nReturn ONLY valid JSON:\n{"score":N,"maxScore":${maxScore},"percentage":N,"grade":"A|B|C|D|F","feedback":"...","strengths":["..."],"improvements":["..."],"modelAnswer":"..."}`
    const response = await this._generate('gemini-2.5-flash', prompt, { responseMimeType: 'application/json' }, 'autoGrade')
    const result = JSON.parse(response.text)
    result.score = Math.max(0, Math.min(maxScore, Number(result.score) || 0))
    result.percentage = Math.round((result.score / maxScore) * 100)
    return result
  }

  async extractTextFromImage(imageBuffer, mimeType) {
    await this._init()
    const base64 = imageBuffer.toString('base64')
    const response = await this._generate(
      'gemini-2.0-flash',
      [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: 'Extract all text from this image. Return only the extracted text, no commentary.' },
          ],
        },
      ],
      {},
      'extractTextFromImage',
    )
    return response.text || ''
  }

  async analyticsInsights(studentData, type = 'general') {
    const prompt = type === 'at-risk'
      ? `Analyze student performance data and identify at-risk students. Return JSON:\n{"atRiskStudents":[{"studentId":"...","studentName":"...","riskLevel":"high|medium|low","reasons":["..."],"suggestions":["..."]}]}\n\nData:\n${JSON.stringify(studentData)}`
      : `Analyze this educational data and provide insights. Return JSON:\n{"summary":"...","trends":["..."],"recommendations":["..."],"highlights":["..."]}\n\nData:\n${JSON.stringify(studentData)}`
    const response = await this._generate('gemini-2.5-flash', prompt, { responseMimeType: 'application/json' }, 'analyticsInsights')
    return JSON.parse(response.text)
  }
}

// ─── Factory / singleton ──────────────────────────────────────────────────────

let _instance = null

export function getLLMService() {
  if (_instance) return _instance
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY
  if (!apiKey) {
    console.warn('⚠️  GEMINI_API_KEY not set — LLM features disabled')
    return null
  }
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase()
  switch (provider) {
    case 'gemini':
    default:
      _instance = new GeminiAdapter(apiKey)
      console.log('✅ LLM service: GeminiAdapter')
      return _instance
    // Future: case 'openai': _instance = new OpenAIAdapter(apiKey); break
    // Future: case 'local':  _instance = new LocalLlamaAdapter(opts); break
  }
}
