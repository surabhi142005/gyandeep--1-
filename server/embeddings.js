/**
 * embeddings.js — RAG-Lite Embedding Pipeline for Gyandeep
 *
 * Stores lesson content as text chunks with simple TF-IDF vectors.
 * When Supabase + pgvector is configured, uses Supabase Vector for storage.
 * Falls back to an in-memory + disk JSON store for zero-dependency operation.
 *
 * Exported API:
 *   indexContent(doc)                   → Promise<{ id, chunks }>
 *   semanticSearch(query, opts?)        → Promise<SearchResult[]>
 *   buildContext(query, opts?)          → Promise<string>  (for RAG prompt injection)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORE_FILE = path.join(__dirname, 'data', 'embeddings.json')

// ─── Supabase probe ───────────────────────────────────────────────────────────
let supabase = null
try {
  const { createClient } = await import('@supabase/supabase-js')
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  if (url && key) {
    supabase = createClient(url, key)
    console.log('✅ Supabase connected for RAG vector store')
  }
} catch { /* @supabase/supabase-js not installed or env missing */ }

const USE_SUPABASE = !!supabase

// ─── In-memory / disk store ───────────────────────────────────────────────────
let memStore = []

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      memStore = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8') || '[]')
    }
  } catch { memStore = [] }
}

function saveStore() {
  try {
    const dir = path.dirname(STORE_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    // Keep last 2000 chunks
    if (memStore.length > 2000) memStore = memStore.slice(-2000)
    fs.writeFileSync(STORE_FILE, JSON.stringify(memStore, null, 2))
  } catch { /* ignore */ }
}

loadStore()

// ─── Text utilities ───────────────────────────────────────────────────────────

/**
 * Split text into overlapping chunks for better retrieval.
 */
function chunkText(text, chunkSize = 400, overlap = 80) {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks = []
  let i = 0
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    if (chunk.trim()) chunks.push(chunk)
    i += chunkSize - overlap
  }
  return chunks
}

/**
 * Build a simple term-frequency map for cosine similarity.
 * Lowercases and strips punctuation.
 */
function termFreq(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)

  const tf = {}
  for (const w of words) {
    tf[w] = (tf[w] || 0) + 1
  }
  return tf
}

/**
 * Cosine similarity between two TF maps.
 */
function cosineSim(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  let dot = 0, magA = 0, magB = 0
  for (const k of keys) {
    const va = a[k] || 0
    const vb = b[k] || 0
    dot += va * vb
    magA += va * va
    magB += vb * vb
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Index a document (lesson note, subject content, etc.)
 * @param {{ id?: string, classId: string, subjectId: string, title: string, text: string }} doc
 */
export async function indexContent(doc) {
  const docId = doc.id || `doc-${Date.now()}`
  const chunks = chunkText(doc.text)
  const timestamp = new Date().toISOString()

  if (USE_SUPABASE) {
    // Upsert chunks into Supabase `lesson_chunks` table
    // Table schema: id, doc_id, class_id, subject_id, title, chunk_index, content, created_at
    const rows = chunks.map((content, idx) => ({
      id: `${docId}-${idx}`,
      doc_id: docId,
      class_id: doc.classId,
      subject_id: doc.subjectId,
      title: doc.title,
      chunk_index: idx,
      content,
      created_at: timestamp,
    }))

    // Delete old chunks for this doc first
    await supabase.from('lesson_chunks').delete().eq('doc_id', docId)
    const { error } = await supabase.from('lesson_chunks').insert(rows)
    if (error) {
      console.warn('Supabase insert error:', error.message)
      // Fall through to local store
    } else {
      return { id: docId, chunks: chunks.length, mode: 'supabase' }
    }
  }

  // Local in-memory + disk store
  // Remove old chunks for same docId
  memStore = memStore.filter(c => c.docId !== docId)

  const newChunks = chunks.map((content, idx) => ({
    id: `${docId}-${idx}`,
    docId,
    classId: doc.classId,
    subjectId: doc.subjectId,
    title: doc.title,
    chunkIndex: idx,
    content,
    tf: termFreq(content),
    createdAt: timestamp,
  }))

  memStore.push(...newChunks)
  saveStore()

  return { id: docId, chunks: chunks.length, mode: 'local' }
}

/**
 * Semantic search over indexed content.
 * @param {string} query
 * @param {{ classId?: string, subjectId?: string, topK?: number }} [opts]
 * @returns {Promise<Array<{ id, docId, title, content, score }>>}
 */
export async function semanticSearch(query, opts = {}) {
  const { classId, subjectId, topK = 5 } = opts

  if (USE_SUPABASE) {
    // Simple full-text search via Supabase (no pgvector needed)
    let q = supabase
      .from('lesson_chunks')
      .select('id, doc_id, title, content')
      .textSearch('content', query, { type: 'plain', config: 'english' })
      .limit(topK)

    if (classId) q = q.eq('class_id', classId)
    if (subjectId) q = q.eq('subject_id', subjectId)

    const { data, error } = await q
    if (!error && data) {
      return data.map((r, i) => ({
        id: r.id,
        docId: r.doc_id,
        title: r.title,
        content: r.content,
        score: 1 - i * 0.05, // approximate relevance rank
      }))
    }
    // Fall through to local on error
  }

  // Local TF-IDF cosine search
  const queryTf = termFreq(query)
  let candidates = memStore
  if (classId) candidates = candidates.filter(c => c.classId === classId)
  if (subjectId) candidates = candidates.filter(c => c.subjectId === subjectId)

  const scored = candidates.map(chunk => ({
    id: chunk.id,
    docId: chunk.docId,
    title: chunk.title,
    content: chunk.content,
    score: cosineSim(queryTf, chunk.tf || termFreq(chunk.content)),
  }))

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK).filter(r => r.score > 0)
}

/**
 * Build a RAG context string to inject into a chat prompt.
 * Returns empty string if no relevant chunks found.
 * @param {string} query
 * @param {{ classId?: string, subjectId?: string, topK?: number }} [opts]
 */
export async function buildContext(query, opts = {}) {
  const results = await semanticSearch(query, { topK: 3, ...opts })
  if (!results.length) return ''

  const sections = results.map((r, i) =>
    `[Source ${i + 1}: ${r.title}]\n${r.content}`
  )

  return `\n\n---\nRelevant lesson material:\n${sections.join('\n\n')}\n---\n`
}

/**
 * Returns stats about the current index.
 */
export function indexStats() {
  if (USE_SUPABASE) return { mode: 'supabase', chunks: 'N/A (query Supabase)' }
  const byDoc = {}
  for (const c of memStore) {
    byDoc[c.docId] = (byDoc[c.docId] || 0) + 1
  }
  return { mode: 'local', chunks: memStore.length, documents: Object.keys(byDoc).length }
}
