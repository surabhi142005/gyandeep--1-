/**
 * server/services/aiService.js
 * Unified AI Service Layer - Provider-agnostic AI calls
 *
 * Uses purpose-specific Groq API keys for chat, content, and analytics.
 * Gemini is reserved for vision/OCR tasks only.
 *
 * Environment Variables:
 *   GROQ_API_KEY_CHAT       - Groq API key for chatbot
 *   GROQ_API_KEY_CONTENT    - Groq API key for content generation (quizzes, grading, etc.)
 *   GROQ_API_KEY_ANALYTICS  - Groq API key for analytics
 *   GEMINI_API_KEY          - Gemini API key for vision tasks
 *   GROQ_MODEL              - Groq model (default: llama-3.3-70b-versatile)
 *   GEMINI_MODEL            - Gemini model (default: gemini-2.0-flash)
 */

import '../utils/env.js';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Model configuration ─────────────────────────────────────────
// Define these first so they can be used in logging below
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

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
  if (HAS_GROQ_CHAT) console.log('[AI] Provider: Groq (chat) ready with model:', GROQ_MODEL);
  if (HAS_GROQ_CONTENT) console.log('[AI] Provider: Groq (content) ready with model:', GROQ_MODEL);
  if (HAS_GROQ_ANALYTICS) console.log('[AI] Provider: Groq (analytics) ready with model:', GROQ_MODEL);
  if (HAS_GEMINI) console.log('[AI] Provider: Gemini ready with model:', GEMINI_MODEL);
}

// Debug: log env key presence (masked)
console.log('[AI] Env check - GROQ_API_KEY_CHAT present:', !!process.env.GROQ_API_KEY_CHAT);
console.log('[AI] Env check - GROQ_API_KEY_CONTENT present:', !!process.env.GROQ_API_KEY_CONTENT);
console.log('[AI] Env check - GROQ_API_KEY_ANALYTICS present:', !!process.env.GROQ_API_KEY_ANALYTICS);
console.log('[AI] Env check - GROQ_BASE_URL:', process.env.GROQ_BASE_URL || 'not set (using default)');
console.log('[AI] Env check - GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);

// ── Initialize clients ─────────────────────────────────────────
// Clean baseURL if it ends with /openai/v1 to prevent duplication by the SDK
const rawBaseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com';
const GROQ_BASE_URL = rawBaseUrl.replace(/\/openai\/v1\/?$/, '');

if (process.env.GROQ_BASE_URL) {
  console.log('[AI] Using custom GROQ_BASE_URL (cleaned):', GROQ_BASE_URL);
}

const groqChatClient = HAS_GROQ_CHAT
  ? new Groq({ apiKey: process.env.GROQ_API_KEY_CHAT.trim(), baseURL: GROQ_BASE_URL })
  : null;

const groqContentClient = HAS_GROQ_CONTENT
  ? new Groq({ apiKey: process.env.GROQ_API_KEY_CONTENT.trim(), baseURL: GROQ_BASE_URL })
  : null;

const groqAnalyticsClient = HAS_GROQ_ANALYTICS
  ? new Groq({ apiKey: process.env.GROQ_API_KEY_ANALYTICS.trim(), baseURL: GROQ_BASE_URL })
  : null;

const geminiClient = HAS_GEMINI
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim())
  : null;

const GROQ_CLIENTS = {
  chat: groqChatClient,
  content: groqContentClient,
  analytics: groqAnalyticsClient,
};

const GROQ_KEY_NAMES = {
  chat: 'GROQ_API_KEY_CHAT',
  content: 'GROQ_API_KEY_CONTENT',
  analytics: 'GROQ_API_KEY_ANALYTICS',
};

// ── Helper: get groq client for purpose ─────────────────────────
function getGroqClient(purpose) {
  return GROQ_CLIENTS[purpose] || null;
}

function hasGroqForPurpose(purpose) {
  return !!getGroqClient(purpose);
}

function getRequiredGroqKeyName(purpose) {
  return GROQ_KEY_NAMES[purpose] || 'GROQ_API_KEY';
}

function createUnavailableError(message, status = 503) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function createQuotaError(message) {
  const err = new Error(message);
  err.status = 429;
  return err;
}

function normalizePurpose(purpose) {
  if (purpose === 'chat' || purpose === 'content' || purpose === 'analytics') {
    return purpose;
  }
  return 'content';
}

// ── CORE FUNCTION: callAI ───────────────────────────────────────
// Unified AI call for Groq-backed text generation with Gemini fallback.
// Returns raw text response.

export async function callAI(prompt, options = {}) {
  const {
    systemPrompt = 'You are a helpful AI assistant.',
    maxTokens = 1000,
    temperature = 0.7,
    jsonMode = false,
    purpose = 'content'
  } = options;

  const normalizedPurpose = normalizePurpose(purpose);
  const groqClient = getGroqClient(normalizedPurpose);

  // 1. Try Groq if available
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
      console.log(`[AI] Response from Groq (${normalizedPurpose})`);
      return text;
    } catch (groqErr) {
      console.error(`[AI] Groq (${normalizedPurpose}) failed:`, groqErr.message);
      // If it's a quota error, we might still want to try Gemini fallback
      if (groqErr.status !== 429 && !HAS_GEMINI) {
        throw groqErr;
      }
      console.log(`[AI] Attempting Gemini fallback for ${normalizedPurpose}...`);
    }
  }

  // 2. Fallback to Gemini
  if (HAS_GEMINI) {
    try {
      const model = geminiClient.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
          responseMimeType: jsonMode ? 'application/json' : 'text/plain'
        }
      });

      const fullPrompt = jsonMode
        ? `System: ${systemPrompt}\n\nReturn ONLY valid JSON. No markdown. No explanation.\n\nUser: ${prompt}`
        : `System: ${systemPrompt}\n\nUser: ${prompt}`;

      const result = await model.generateContent(fullPrompt);
      const text = result.response.text().trim();
      console.log(`[AI] Response from Gemini fallback (${normalizedPurpose})`);
      return text;
    } catch (geminiErr) {
      console.error(`[AI] Gemini fallback failed:`, geminiErr.message);
      if (geminiErr.message?.includes('429')) {
        throw createQuotaError('AI service is currently busy (Quota exceeded). Please try again in a minute.');
      }
      throw geminiErr;
    }
  }

  // 3. No providers available
  throw createUnavailableError(
    `AI service unavailable for ${normalizedPurpose}. Set ${getRequiredGroqKeyName(normalizedPurpose)} or GEMINI_API_KEY.`
  );
}

// ── CHAT FUNCTION: callAIChat ─────────────────────────────────
// Multi-turn conversation (chatbot) with Gemini fallback
// history: [{ role: 'user'|'assistant', content: string }]

export async function callAIChat(message, history = [], systemPrompt = '') {
  const defaultSystem = 'You are a helpful educational assistant.';
  const finalSystem = systemPrompt || defaultSystem;
  
  // 1. Try Groq if available
  if (HAS_GROQ_CHAT && groqChatClient) {
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
    } catch (groqErr) {
      console.error('[AI] Groq chat failed:', groqErr.message);
      if (groqErr.status !== 429 && !HAS_GEMINI) {
        throw groqErr;
      }
      console.log('[AI] Attempting Gemini fallback for chat...');
    }
  }

  // 2. Fallback to Gemini
  if (HAS_GEMINI) {
    try {
      const model = geminiClient.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
      });

      const chat = model.startChat({
        history: history.slice(-10).map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content || h.text || '' }]
        })),
        systemInstruction: finalSystem
      });

      const result = await chat.sendMessage(message);
      console.log('[AI] Response from Gemini fallback (chat)');
      return result.response.text().trim();
    } catch (geminiErr) {
      console.error('[AI] Gemini chat fallback failed:', geminiErr.message);
      if (geminiErr.message?.includes('429')) {
        return "I'm currently experiencing high traffic and my API quota has been exceeded. Please wait about a minute and try again.";
      }
      throw geminiErr;
    }
  }

  throw createUnavailableError('Chatbot unavailable: Set GROQ_API_KEY_CHAT or GEMINI_API_KEY.');
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
    if (err.message?.includes('429') || err.message?.includes('Quota exceeded')) {
      const quotaErr = new Error('Image analysis is currently unavailable due to high traffic (Quota exceeded). Please try again later.');
      quotaErr.status = 429;
      throw quotaErr;
    }
    throw err;
  }
}

// ── PARSE JSON SAFELY ─────────────────────────────────────────
// Parse AI JSON response, handling markdown and common issues

export function parseAIJson(text) {
  if (!text || text.trim() === '') {
    return [];
  }
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
    console.error('[AI] JSON Parse Error:', err.message);
    console.error('[AI] Attempted to parse:', jsonStr.substring(0, 500));
    
    // Final attempt: find anything that looks like an array if the structured match failed
    if (text.includes('[') && text.includes(']')) {
       try {
         const start = text.indexOf('[');
         const end = text.lastIndexOf(']') + 1;
         return JSON.parse(text.substring(start, end));
       } catch (innerErr) {
         throw new Error('AI returned invalid JSON: ' + err.message + '\nRaw: ' + text.substring(0, 200));
       }
    }
    throw new Error('AI returned invalid JSON: ' + err.message + '\nRaw: ' + text.substring(0, 200));
  }
}

// ── UTILITY: Get provider status ───────────────────────────────

export function getAIStatus() {
  return {
    aiEnabled: HAS_ANY_GROQ || HAS_GEMINI,
    chatProvider: HAS_GROQ_CHAT ? 'groq' : 'none',
    contentProvider: HAS_GROQ_CONTENT ? 'groq' : 'none',
    analyticsProvider: HAS_GROQ_ANALYTICS ? 'groq' : 'none',
    visionProvider: HAS_GEMINI ? 'gemini' : 'none',
    groqChatEnabled: HAS_GROQ_CHAT,
    groqContentEnabled: HAS_GROQ_CONTENT,
    groqAnalyticsEnabled: HAS_GROQ_ANALYTICS,
    geminiEnabled: HAS_GEMINI,
    activeProvider: HAS_ANY_GROQ && HAS_GEMINI ? 'mixed' : HAS_ANY_GROQ ? 'groq' : HAS_GEMINI ? 'gemini' : 'none',
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
