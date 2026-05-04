/**
 * server/services/aiService.js
 * Unified AI Service Layer - Provider-agnostic AI calls
 *
 * Supports Groq and Gemini AI providers via environment variables.
 * Groq is tried first (faster), Gemini as fallback.
 *
 * Environment Variables:
 *   GROQ_API_KEY_CHAT       - Groq API key for chatbot
 *   GROQ_API_KEY_CONTENT    - Groq API key for content generation (quizzes, grading, etc.)
 *   GROQ_API_KEY_ANALYTICS  - Groq API key for analytics
 *   GEMINI_API_KEY          - Gemini API key (fallback for all purposes)
 *   GROQ_MODEL              - Groq model (default: llama3-8b-8192)
 *   GEMINI_MODEL            - Gemini model (default: gemini-1.5-flash)
 */

import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Detect configured providers ───────────────────────────────
const HAS_GROQ_CHAT = !!(process.env.GROQ_API_KEY_CHAT?.trim());
const HAS_GROQ_CONTENT = !!(process.env.GROQ_API_KEY_CONTENT?.trim());
const HAS_GROQ_ANALYTICS = !!(process.env.GROQ_API_KEY_ANALYTICS?.trim());
const HAS_GEMINI = !!(process.env.GEMINI_API_KEY?.trim());
const HAS_ANY_GROQ = HAS_GROQ_CHAT || HAS_GROQ_CONTENT || HAS_GROQ_ANALYTICS;

// Validate on startup
if (!HAS_ANY_GROQ && !HAS_GEMINI) {
  console.error('[AI] No AI API key configured. Set GROQ_API_KEY_CHAT, GROQ_API_KEY_CONTENT, GROQ_API_KEY_ANALYTICS, or GEMINI_API_KEY.');
} else {
  if (HAS_GROQ_CHAT) console.log('[AI] Provider: Groq (chat) ready');
  if (HAS_GROQ_CONTENT) console.log('[AI] Provider: Groq (content) ready');
  if (HAS_GROQ_ANALYTICS) console.log('[AI] Provider: Groq (analytics) ready');
  if (HAS_GEMINI) console.log('[AI] Provider: Gemini ready (fallback)');
}

// ── Initialize clients ─────────────────────────────────────────
const groqChatClient = HAS_GROQ_CHAT
  ? new Groq({ apiKey: process.env.GROQ_API_KEY_CHAT.trim(), baseURL: process.env.GROQ_BASE_URL })
  : null;

const groqContentClient = HAS_GROQ_CONTENT
  ? new Groq({ apiKey: process.env.GROQ_API_KEY_CONTENT.trim(), baseURL: process.env.GROQ_BASE_URL })
  : null;

const groqAnalyticsClient = HAS_GROQ_ANALYTICS
  ? new Groq({ apiKey: process.env.GROQ_API_KEY_ANALYTICS.trim(), baseURL: process.env.GROQ_BASE_URL })
  : null;

const geminiClient = HAS_GEMINI
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim())
  : null;

// ── Model configuration ─────────────────────────────────────────
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

// ── Helper: get groq client for purpose ─────────────────────────
function getGroqClient(purpose) {
  switch (purpose) {
    case 'chat': return groqChatClient;
    case 'content': return groqContentClient;
    case 'analytics': return groqAnalyticsClient;
    default: return groqChatClient || groqContentClient || groqAnalyticsClient;
  }
}

function hasGroqForPurpose(purpose) {
  switch (purpose) {
    case 'chat': return HAS_GROQ_CHAT;
    case 'content': return HAS_GROQ_CONTENT;
    case 'analytics': return HAS_GROQ_ANALYTICS;
    default: return HAS_ANY_GROQ;
  }
}

// ── CORE FUNCTION: callAI ───────────────────────────────────────
// Unified AI call - tries Groq first, falls back to Gemini.
// Returns raw text response.

export async function callAI(prompt, options = {}) {
  const {
    systemPrompt = 'You are a helpful AI assistant.',
    maxTokens = 1000,
    temperature = 0.7,
    jsonMode = false,
    purpose = 'content'
  } = options;

  const groqClient = getGroqClient(purpose);
  const hasGroq = hasGroqForPurpose(purpose);

  // Try Groq first (faster)
  if (groqClient) {
    try {
      const messages = [
        {
          role: 'system',
          content: jsonMode
            ? systemPrompt + ' Return ONLY valid JSON. No markdown. No explanation.'
            : systemPrompt
        },
        { role: 'user', content: prompt }
      ];

      const completion = await groqClient.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
      });

      const text = completion.choices[0]?.message?.content || '';
      console.log(`[AI] Response from Groq (${purpose})`);
      return text;
    } catch (groqErr) {
      console.warn(`[AI] Groq (${purpose}) failed, trying Gemini:`, groqErr.message);
      if (!geminiClient) throw groqErr;
    }
  }

  // Fallback to Gemini
  if (geminiClient) {
    try {
      const model = geminiClient.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { maxOutputTokens: maxTokens, temperature }
      });

      const fullPrompt = jsonMode
        ? `${systemPrompt}\nReturn ONLY valid JSON. No markdown. No explanation.\n\n${prompt}`
        : `${systemPrompt}\n\n${prompt}`;

      const result = await model.generateContent(fullPrompt);
      let text = result.response.text().trim();

      // Strip markdown code blocks if AI adds them
      text = text.replace(/^```json\n?/g, '').replace(/^```\n?/g, '').replace(/```json\n?$/g, '').replace(/```\n?$/g, '').trim();
      console.log('[AI] Response from Gemini');
      return text;
    } catch (geminiErr) {
      console.error('[AI] Gemini also failed:', geminiErr.message);
      throw geminiErr;
    }
  }

  throw new Error(`No AI provider configured for ${purpose}. Set GROQ_API_KEY_${purpose.toUpperCase()} or GEMINI_API_KEY.`);
}

// ── CHAT FUNCTION: callAIChat ─────────────────────────────────
// Multi-turn conversation (chatbot)
// history: [{ role: 'user'|'assistant', content: string }]

export async function callAIChat(message, history = [], systemPrompt = '') {
  const defaultSystem = 'You are a helpful educational assistant.';
  const finalSystem = systemPrompt || defaultSystem;

  // Try Groq chat client first
  if (groqChatClient) {
    try {
      const messages = [
        { role: 'system', content: finalSystem },
        ...history.slice(-10).map(h => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content || h.text || ''
        })),
        { role: 'user', content: message }
      ];

      const completion = await groqChatClient.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        max_tokens: 500,
        temperature: 0.7
      });

      return completion.choices[0]?.message?.content || '';
    } catch (err) {
      console.warn('[AI] Groq chat failed, trying Gemini:', err.message);
      if (!geminiClient) throw err;
    }
  }

  // Fallback to Gemini
  if (geminiClient) {
    const model = geminiClient.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { maxOutputTokens: 500 }
    });

    const chatHistory = [
      { role: 'user', parts: [{ text: finalSystem }] },
      { role: 'model', parts: [{ text: 'Understood, ready to help!' }] },
      ...history.slice(-10).map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content || h.text || '' }]
      }))
    ];

    const chatSession = model.startChat({ history: chatHistory });
    const result = await chatSession.sendMessage(message);
    return result.response.text();
  }

  throw new Error('No AI provider configured for chat. Set GROQ_API_KEY_CHAT or GEMINI_API_KEY.');
}

// ── VISION FUNCTION: callAIVision ───────────────────────────────
// For image analysis (OCR, etc.)

export async function callAIVision(prompt, imageBase64) {
  if (!geminiClient) {
    throw new Error('Gemini not configured for vision tasks. Set GEMINI_API_KEY.');
  }

  try {
    const model = geminiClient.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { maxOutputTokens: 2048, temperature: 0.1 }
    });

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const result = await model.generateContent([
      { text: prompt },
      {
        inline_data: {
          mime_type: 'image/jpeg',
          data: cleanBase64
        }
      }
    ]);

    return result.response.text().trim();
  } catch (err) {
    console.error('[AI] Vision failed:', err.message);
    throw err;
  }
}

// ── PARSE JSON SAFELY ─────────────────────────────────────────
// Parse AI JSON response, handling markdown and common issues

export function parseAIJson(text) {
  let clean = text.trim()
    .replace(/^```json\n?/g, '')
    .replace(/^```\n?/g, '')
    .replace(/```json\n?$/g, '')
    .replace(/```\n?$/g, '')
    .trim();

  // Try to extract JSON array or object
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  const objMatch = clean.match(/\{[\s\S]*\}/);
  const jsonStr = arrMatch?.[0] || objMatch?.[0] || clean;

  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    throw new Error('AI returned invalid JSON: ' + err.message + '\nRaw: ' + text.substring(0, 200));
  }
}

// ── UTILITY: Get provider status ───────────────────────────────

export function getAIStatus() {
  return {
    groqChatEnabled: HAS_GROQ_CHAT,
    groqContentEnabled: HAS_GROQ_CONTENT,
    groqAnalyticsEnabled: HAS_GROQ_ANALYTICS,
    geminiEnabled: HAS_GEMINI,
    activeProvider: HAS_ANY_GROQ ? 'groq' : HAS_GEMINI ? 'gemini' : 'none',
    groqModel: GROQ_MODEL,
    geminiModel: GEMINI_MODEL
  };
}

export default {
  callAI,
  callAIChat,
  callAIVision,
  parseAIJson,
  getAIStatus
};