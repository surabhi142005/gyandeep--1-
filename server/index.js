import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { GoogleGenAI, Type } from '@google/genai'
import http from 'http'
import { URL } from 'url'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY
if (!apiKey) {
  throw new Error('Missing GEMINI_API_KEY or API_KEY in environment')
}

const ai = new GoogleGenAI({ apiKey })

const postJSON = (targetUrl, body) => {
  const urlObj = new URL(targetUrl)
  const payload = JSON.stringify(body)
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || 80,
    path: urlObj.pathname,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  }
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}')
          if (res.statusCode && res.statusCode >= 400) {
            const err = new Error(json.error || `HTTP ${res.statusCode}`)
            err.status = res.statusCode
            reject(err)
            return
          }
          resolve(json)
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

app.post('/api/quiz', async (req, res) => {
  try {
    const { notesText, subject, enableThinkingMode } = req.body || {}
    if (!notesText || !subject) {
      return res.status(400).json({ error: 'notesText and subject are required' })
    }
    const modelName = enableThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash'
    const config = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          quiz: {
            type: Type.ARRAY,
            description: 'An array of 5 quiz questions.',
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING }
              },
              required: ['question', 'options', 'correctAnswer']
            }
          }
        },
        required: ['quiz']
      }
    }
    if (enableThinkingMode) {
      config.thinkingConfig = { thinkingBudget: 32768 }
    }
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Based on the following class notes for the subject "${subject}", generate exactly 5 multiple-choice quiz questions. Each question must have 4 options and a single correct answer. Ensure the correct answer is one of the options.\n\nClass Notes:\n---\n${notesText}\n---\n`,
      config
    })
    const jsonResponse = JSON.parse(response.text)
    if (!jsonResponse.quiz || jsonResponse.quiz.length === 0) {
      return res.status(502).json({ error: 'AI failed to generate a valid quiz.' })
    }
    const quiz = jsonResponse.quiz.map((q, index) => ({ ...q, id: `q-${Date.now()}-${index}` }))
    return res.json({ quiz })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('SAFETY')) {
      return res.status(400).json({ error: 'Could not generate quiz: The provided notes may contain inappropriate content.' })
    }
    if (message.includes('400')) {
      return res.status(400).json({ error: 'Could not generate quiz: The request was malformed. Please check the notes content and try again.' })
    }
    return res.status(500).json({ error: `AI service error: ${message}` })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, location, model } = req.body || {}
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' })
    }
    const modelName = model === 'fast' ? 'gemini-flash-lite-latest' : 'gemini-2.5-flash'
    const config = { tools: [{ googleMaps: {} }] }
    if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
      config.toolConfig = { retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } } }
    }
    const response = await ai.models.generateContent({ model: modelName, contents: prompt, config })
    const text = response.text
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    const sources = groundingChunks
      .filter((chunk) => chunk.maps)
      .flatMap((chunk) => {
        const foundSources = []
        if (chunk.maps.uri && chunk.maps.title) {
          foundSources.push({ uri: chunk.maps.uri, title: chunk.maps.title })
        }
        if (chunk.maps.placeAnswerSources?.reviewSnippets) {
          for (const snippet of chunk.maps.placeAnswerSources.reviewSnippets) {
            if (snippet.uri && snippet.title) {
              foundSources.push({ uri: snippet.uri, title: snippet.title })
            }
          }
        }
        return foundSources
      })
      .filter((source, index, self) => index === self.findIndex((s) => s.uri === source.uri))
    return res.json({ text, sources })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('SAFETY')) {
      return res.status(400).json({ error: 'The response was blocked due to safety concerns. Please try a different prompt.' })
    }
    if (message.includes('400')) {
      return res.status(400).json({ error: 'The request was invalid. Please rephrase your question and try again.' })
    }
    return res.status(500).json({ error: `AI assistant error: ${message}` })
  }
})

const dataDir = path.join(process.cwd(), 'server', 'data')
const storageDir = path.join(process.cwd(), 'server', 'storage')
const usersFile = path.join(dataDir, 'users.json')
const notesDir = path.join(storageDir, 'notes')
const classesFile = path.join(dataDir, 'classes.json')

const ensureDirs = () => {
  try { if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true }) } catch {}
  try { if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true }) } catch {}
  try { if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true }) } catch {}
}

ensureDirs()
app.use('/storage', express.static(storageDir))

app.get('/api/users', (req, res) => {
  try {
    if (!fs.existsSync(usersFile)) return res.json([])
    const raw = fs.readFileSync(usersFile, 'utf8')
    const users = JSON.parse(raw || '[]')
    return res.json(users)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.post('/api/users/bulk', (req, res) => {
  try {
    const users = req.body
    if (!Array.isArray(users)) {
      return res.status(400).json({ error: 'Expected an array of users' })
    }
    ensureDirs()
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8')
    return res.json({ ok: true, count: users.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.post('/api/notes/upload', (req, res) => {
  try {
    const { classId, subjectId, content } = req.body || {}
    if (!content || !subjectId || !classId) {
      return res.status(400).json({ error: 'classId, subjectId, and content are required' })
    }
    ensureDirs()
    const dir = path.join(notesDir, String(classId), String(subjectId))
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const fileName = `${Date.now()}.txt`
    const filePath = path.join(dir, fileName)
    fs.writeFileSync(filePath, content, 'utf8')
    const urlPath = `/storage/notes/${encodeURIComponent(classId)}/${encodeURIComponent(subjectId)}/${fileName}`
    return res.json({ url: urlPath })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.get('/api/notes/list', (req, res) => {
  try {
    const classId = String(req.query.classId || '')
    const subjectId = String(req.query.subjectId || '')
    if (!classId || !subjectId) {
      return res.status(400).json({ error: 'classId and subjectId are required' })
    }
    const dir = path.join(notesDir, classId, subjectId)
    if (!fs.existsSync(dir)) return res.json([])
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt'))
    const items = files.map((f) => ({ url: `/storage/notes/${encodeURIComponent(classId)}/${encodeURIComponent(subjectId)}/${f}`, name: f }))
    return res.json(items)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

const port = process.env.PORT ? Number(process.env.PORT) : 3001
app.listen(port, () => {
  process.stdout.write(`Backend running on http://localhost:${port}\n`)
})

app.post('/api/auth/face', async (req, res) => {
  try {
    const { image } = req.body || {}
    if (!image) {
      return res.status(400).json({ error: 'image is required' })
    }
    const result = await postJSON('http://localhost:5001/auth/face', { image })
    return res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = (error && error.status) ? error.status : 500
    return res.status(status).json({ error: message })
  }
})

app.post('/api/auth/location', async (req, res) => {
  try {
    const { lat, lng, target_lat, target_lng, radius_m } = req.body || {}
    if (typeof lat !== 'number' || typeof lng !== 'number' || typeof target_lat !== 'number' || typeof target_lng !== 'number') {
      return res.status(400).json({ error: 'lat,lng,target_lat,target_lng are required numbers' })
    }
    const result = await postJSON('http://localhost:5001/auth/location', { lat, lng, target_lat, target_lng, radius_m })
    return res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = (error && error.status) ? error.status : 500
    return res.status(status).json({ error: message })
  }
})

app.get('/api/classes', (req, res) => {
  try {
    if (!fs.existsSync(classesFile)) return res.json([])
    const raw = fs.readFileSync(classesFile, 'utf8')
    const classes = JSON.parse(raw || '[]')
    return res.json(classes)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.post('/api/classes', (req, res) => {
  try {
    const classes = req.body
    if (!Array.isArray(classes)) {
      return res.status(400).json({ error: 'Expected an array of classes' })
    }
    ensureDirs()
    fs.writeFileSync(classesFile, JSON.stringify(classes, null, 2), 'utf8')
    return res.json({ ok: true, count: classes.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.post('/api/classes/assign', (req, res) => {
  try {
    const { studentId, classId } = req.body || {}
    if (!studentId) return res.status(400).json({ error: 'studentId is required' })
    ensureDirs()
    const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]') : []
    const updated = users.map((u) => {
      if (u.role === 'student' && u.id === studentId) {
        return { ...u, classId }
      }
      return u
    })
    fs.writeFileSync(usersFile, JSON.stringify(updated, null, 2), 'utf8')
    return res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})