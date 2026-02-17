import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { GoogleGenAI, Type } from '@google/genai'
import http from 'http'
import { URL } from 'url'
import fs from 'fs'
import path from 'path'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'


dotenv.config({ path: '.env.local' })
dotenv.config()

const app = express()
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'], credentials: true })) // Update CORS for cookie
app.use(express.json())

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

const dataDir = path.join(process.cwd(), 'server', 'data') // Defined earlier for usage
const usersFile = path.join(dataDir, 'users.json')

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
    (accessToken, refreshToken, profile, done) => {
      try {
        const ensureDataDir = () => { try { if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true }) } catch { } }
        ensureDataDir()

        const usersRaw = fs.existsSync(usersFile) ? fs.readFileSync(usersFile, 'utf8') : '[]'
        const users = JSON.parse(usersRaw || '[]')

        let user = users.find(u => u.googleId === profile.id || (u.email && profile.emails && u.email === profile.emails[0].value))

        if (!user) {
          user = {
            id: `u-${Date.now()}`,
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            role: 'student',
            faceImage: null,
            preferences: {},
            history: []
          }
          users.push(user)
          fs.writeFileSync(usersFile, JSON.stringify(users, null, 2))
        } else if (!user.googleId) {
          // Link existing
          user.googleId = profile.id
          const idx = users.findIndex(u => u.id === user.id)
          users[idx] = user
          fs.writeFileSync(usersFile, JSON.stringify(users, null, 2))
        }

        return done(null, user)
      } catch (err) {
        return done(err)
      }
    }
  ))
}

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  try {
    if (!fs.existsSync(usersFile)) return done(null, null)
    const usersRaw = fs.readFileSync(usersFile, 'utf8')
    const users = JSON.parse(usersRaw || '[]')
    const user = users.find(u => u.id === id)
    done(null, user)
  } catch (err) {
    done(err)
  }
})

app.use(session({ secret: 'gyandeep-secret-key', resave: false, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(`http://localhost:5173?login_success=true`);
  });

app.get('/api/auth/current_user', (req, res) => {
  res.json(req.user || null)
})

app.get('/api/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
})


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

const storageDir = path.join(process.cwd(), 'server', 'storage')
const notesDir = path.join(storageDir, 'notes')
const classesFile = path.join(dataDir, 'classes.json')
const questionBankFile = path.join(dataDir, 'questionBank.json')
const auditLogFile = path.join(dataDir, 'audit.json')
const tagsPresetsFile = path.join(dataDir, 'tagsPresets.json')

const ensureDirs = () => {
  try { if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true }) } catch { }
  try { if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true }) } catch { }
  try { if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true }) } catch { }
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

// --- Question Bank ---
app.get('/api/question-bank', (req, res) => {
  try {
    if (!fs.existsSync(questionBankFile)) return res.json([])
    const raw = fs.readFileSync(questionBankFile, 'utf8')
    const bank = JSON.parse(raw || '[]')
    return res.json(bank)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.post('/api/question-bank/add', (req, res) => {
  try {
    const { questions } = req.body || {}
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'questions must be an array' })
    }
    const existing = fs.existsSync(questionBankFile) ? JSON.parse(fs.readFileSync(questionBankFile, 'utf8') || '[]') : []
    const tagged = questions.map(q => ({
      id: q.id || `qb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      question: String(q.question || ''),
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: String(q.correctAnswer || ''),
      tags: Array.isArray(q.tags) ? q.tags : [],
      difficulty: q.difficulty || 'medium',
      subject: q.subject || 'general'
    }))
    const merged = existing.concat(tagged)
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(questionBankFile, JSON.stringify(merged, null, 2))
    return res.json({ ok: true, count: merged.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.post('/api/question-bank/upsert-quiz', (req, res) => {
  try {
    const { quiz, subject } = req.body || {}
    if (!Array.isArray(quiz)) {
      return res.status(400).json({ error: 'quiz must be an array' })
    }
    const existing = fs.existsSync(questionBankFile) ? JSON.parse(fs.readFileSync(questionBankFile, 'utf8') || '[]') : []
    const toAdd = quiz.map(q => ({
      id: q.id || `qb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      question: String(q.question || ''),
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: String(q.correctAnswer || ''),
      tags: Array.isArray(q.tags) ? q.tags : ['generated'],
      difficulty: q.difficulty || 'medium',
      subject: subject || q.subject || 'general'
    }))
    const merged = existing.concat(toAdd)
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(questionBankFile, JSON.stringify(merged, null, 2))
    return res.json({ ok: true, count: merged.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

// --- OTP MFA ---
const otpStore = new Map()
app.post('/api/auth/otp/send', (req, res) => {
  try {
    const { userId } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expires = Date.now() + 5 * 60 * 1000
    otpStore.set(userId, { code, expires })
    console.log(`OTP for ${userId}: ${code}`)
    return res.json({ ok: true, expires })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.post('/api/auth/otp/verify', (req, res) => {
  try {
    const { userId, code } = req.body || {}
    if (!userId || !code) return res.status(400).json({ error: 'userId and code are required' })
    const rec = otpStore.get(userId)
    const ok = !!rec && rec.code === String(code) && rec.expires > Date.now()
    // audit log
    const logEntry = { ts: Date.now(), type: 'otp_verify', userId, ok }
    fs.mkdirSync(dataDir, { recursive: true })
    const existing = fs.existsSync(auditLogFile) ? JSON.parse(fs.readFileSync(auditLogFile, 'utf8') || '[]') : []
    existing.push(logEntry)
    fs.writeFileSync(auditLogFile, JSON.stringify(existing, null, 2))
    if (!ok) return res.status(401).json({ error: 'invalid or expired code' })
    return res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

// --- Password Recovery ---
const resetStore = new Map()
app.post('/api/auth/password/request', (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) return res.status(400).json({ error: 'email is required' })
    const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]') : []
    const exists = users.some(u => (u.email || '').toLowerCase() === String(email).toLowerCase())
    if (!exists) return res.status(404).json({ error: 'No account with that email' })
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expires = Date.now() + 10 * 60 * 1000
    resetStore.set(String(email).toLowerCase(), { code, expires })
    console.log(`Password reset code for ${email}: ${code}`)
    return res.json({ ok: true, expires })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.post('/api/auth/password/verify', (req, res) => {
  try {
    const { email, code } = req.body || {}
    if (!email || !code) return res.status(400).json({ error: 'email and code are required' })
    const rec = resetStore.get(String(email).toLowerCase())
    const ok = !!rec && rec.code === String(code) && rec.expires > Date.now()
    if (!ok) return res.status(401).json({ error: 'invalid or expired code' })
    return res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.post('/api/auth/password/complete', (req, res) => {
  try {
    const { email, newPassword } = req.body || {}
    if (!email || !newPassword) return res.status(400).json({ error: 'email and newPassword are required' })
    const rec = resetStore.get(String(email).toLowerCase())
    if (!rec || rec.expires <= Date.now()) return res.status(401).json({ error: 'invalid or expired code' })
    if (!fs.existsSync(usersFile)) return res.status(404).json({ error: 'No users' })
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]')
    const idx = users.findIndex(u => (u.email || '').toLowerCase() === String(email).toLowerCase())
    if (idx === -1) return res.status(404).json({ error: 'User not found' })
    users[idx].password = String(newPassword)
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2))
    resetStore.delete(String(email).toLowerCase())
    return res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

// --- Admin Override with Audit ---
app.post('/api/admin/override', (req, res) => {
  try {
    const { adminId, userId, action, reason } = req.body || {}
    if (!adminId || !userId || !action) return res.status(400).json({ error: 'adminId, userId, action are required' })
    const entry = { ts: Date.now(), type: 'admin_override', adminId, userId, action, reason: reason || '' }
    fs.mkdirSync(dataDir, { recursive: true })
    const existing = fs.existsSync(auditLogFile) ? JSON.parse(fs.readFileSync(auditLogFile, 'utf8') || '[]') : []
    existing.push(entry)
    fs.writeFileSync(auditLogFile, JSON.stringify(existing, null, 2))
    return res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

// --- Integrations Stubs ---
app.post('/api/integrations/calendar/sync', (req, res) => {
  try {
    const { title, start, end } = req.body || {}
    if (!title || !start || !end) return res.status(400).json({ error: 'title,start,end required' })
    return res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.post('/api/integrations/drive/upload', (req, res) => {
  try {
    const { name, url } = req.body || {}
    if (!name || !url) return res.status(400).json({ error: 'name,url required' })
    return res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.post('/api/question-bank/update', (req, res) => {
  try {
    const { id, patch } = req.body || {}
    if (!id || !patch) return res.status(400).json({ error: 'id and patch required' })
    const existing = fs.existsSync(questionBankFile) ? JSON.parse(fs.readFileSync(questionBankFile, 'utf8') || '[]') : []
    const idx = existing.findIndex(q => q.id === id)
    if (idx === -1) return res.status(404).json({ error: 'question not found' })
    existing[idx] = { ...existing[idx], ...patch }
    fs.writeFileSync(questionBankFile, JSON.stringify(existing, null, 2))
    return res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.delete('/api/question-bank/:id', (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: 'id required' })
    const existing = fs.existsSync(questionBankFile) ? JSON.parse(fs.readFileSync(questionBankFile, 'utf8') || '[]') : []
    const filtered = existing.filter(q => q.id !== id)
    fs.writeFileSync(questionBankFile, JSON.stringify(filtered, null, 2))
    return res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

// --- Tag Presets ---
app.get('/api/tags-presets', (req, res) => {
  try {
    if (!fs.existsSync(tagsPresetsFile)) return res.json({})
    const raw = fs.readFileSync(tagsPresetsFile, 'utf8')
    const map = JSON.parse(raw || '{}')
    return res.json(map)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.post('/api/tags-presets/update', (req, res) => {
  try {
    const { subject, tags } = req.body || {}
    if (!subject || !Array.isArray(tags)) return res.status(400).json({ error: 'subject and tags[] required' })
    const existing = fs.existsSync(tagsPresetsFile) ? JSON.parse(fs.readFileSync(tagsPresetsFile, 'utf8') || '{}') : {}
    existing[subject] = tags
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(tagsPresetsFile, JSON.stringify(existing, null, 2))
    return res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

// --- User Profile & Personalization ---
app.get('/api/users/profile', (req, res) => {
  try {
    const userId = req.query.userId
    if (!userId) return res.status(400).json({ error: 'UserId required' })

    if (!fs.existsSync(usersFile)) return res.json({})
    const raw = fs.readFileSync(usersFile, 'utf8')
    const users = JSON.parse(raw || '[]')
    const user = users.find(u => u.id === userId)

    if (!user) return res.status(404).json({ error: 'User not found' })

    const { password, ...safeUser } = user
    return res.json(safeUser)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.put('/api/users/profile', (req, res) => {
  try {
    const { userId, updates } = req.body
    if (!userId) return res.status(400).json({ error: 'UserId required' })

    if (!fs.existsSync(usersFile)) return res.status(404).json({ error: 'No users' })
    const raw = fs.readFileSync(usersFile, 'utf8')
    const users = JSON.parse(raw || '[]')
    const idx = users.findIndex(u => u.id === userId)

    if (idx === -1) return res.status(404).json({ error: 'User not found' })

    // Safe update
    if (updates.preferences) users[idx].preferences = { ...users[idx].preferences, ...updates.preferences }
    if (updates.name) users[idx].name = updates.name
    if (updates.email) users[idx].email = updates.email

    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2))
    return res.json({ ok: true, user: users[idx] })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})
