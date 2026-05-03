/**
 * server/services/aiService.js
 * Unified AI Service Layer - Provider-agnostic AI calls
 *
 * Supports Groq and Gemini AI providers via environment variables.
 * Groq is tried first (faster), Gemini as fallback.
 *
 * Environment Variables:
 *   AI_API_KEY_GROQ    - Groq API key (from console.groq.com)
 *   AI_API_KEY_GEMINI  - Gemini API key (from aistudio.google.com)
 *   AI_GROQ_MODEL      - Groq model (default: llama3-8b-8192)
 *   AI_GEMINI_MODEL    - Gemini model (default: gemini-1.5-flash)
 */

import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Detect configured providers ───────────────────────────────
const HAS_GROQ = !!(process.env.AI_API_KEY_GROQ?.trim());
const HAS_GEMINI = !!(process.env.AI_API_KEY_GEMINI?.trim());

// Validate on startup
if (!HAS_GROQ && !HAS_GEMINI) {
  console.error('[AI] No AI API key configured. Set AI_API_KEY_GROQ or AI_API_KEY_GEMINI.');
} else {
  if (HAS_GROQ) console.log('[AI] Provider: Groq ready');
  if (HAS_GEMINI) console.log('[AI] Provider: Gemini ready');
}

// ── Initialize clients ─────────────────────────────────────────
const groqClient = HAS_GROQ
  ? new Groq({ apiKey: process.env.AI_API_KEY_GROQ.trim() })
  : null;

const geminiClient = HAS_GEMINI
  ? new GoogleGenerativeAI(process.env.AI_API_KEY_GEMINI.trim())
  : null;

// ── Model configuration ─────────────────────────────────────────
const GROQ_MODEL = process.env.AI_GROQ_MODEL || 'llama3-8b-8192';
const GEMINI_MODEL = process.env.AI_GEMINI_MODEL || 'gemini-1.5-flash';

// ── CORE FUNCTION: callAI ───────────────────────────────────────
// Unified AI call - tries Groq first, falls back to Gemini.
// Returns raw text response.

export async function callAI(prompt, options = {}) {
  const {
    systemPrompt = 'You are a helpful AI assistant.',
    maxTokens = 1000,
    temperature = 0.7,
    jsonMode = false
  } = options;

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
      console.log('[AI] Response from Groq');
      return text;
    } catch (groqErr) {
      console.warn('[AI] Groq failed, trying Gemini:', groqErr.message);
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

  throw new Error('No AI provider configured. Set AI_API_KEY_GROQ or AI_API_KEY_GEMINI.');
}

// ── CHAT FUNCTION: callAIChat ─────────────────────────────────
// Multi-turn conversation (chatbot)
// history: [{ role: 'user'|'assistant', content: string }]

export async function callAIChat(message, history = [], systemPrompt = '') {
  const defaultSystem = 'You are a helpful educational assistant.';
  const finalSystem = systemPrompt || defaultSystem;

  // Try Groq first
  if (groqClient) {
    try {
      const messages = [
        { role: 'system', content: finalSystem },
        ...history.slice(-10).map(h => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content || h.text || ''
        })),
        { role: 'user', content: message }
      ];

      const completion = await groqClient.chat.completions.create({
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

  throw new Error('No AI provider configured.');
}

// ── VISION FUNCTION: callAIVision ───────────────────────────────
// For image analysis (OCR, etc.)

export async function callAIVision(prompt, imageBase64) {
  if (!geminiClient) {
    throw new Error('Gemini not configured for vision tasks. Set AI_API_KEY_GEMINI.');
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
    groqEnabled: HAS_GROQ,
    geminiEnabled: HAS_GEMINI,
    activeProvider: HAS_GROQ ? 'groq' : HAS_GEMINI ? 'gemini' : 'none',
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