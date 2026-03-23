/**
 * server/routes/ai.js
 * AI-powered routes using Gemini API
 */

import express from 'express';
import fetch from 'node-fetch';
const router = express.Router();

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.0-flash';

async function callGemini(prompt, history = [], apiKey) {
  const contents = [
    ...history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: prompt }] },
  ];

  const response = await fetch(
    `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

router.post('/ai-email', async (req, res) => {
  try {
    const { prompt, recipients, context } = req.body;
    
    if (!prompt || !recipients) {
      return res.status(400).json({ error: 'Prompt and recipients are required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(501).json({ 
        error: 'AI not configured',
        message: 'Set GEMINI_API_KEY environment variable for AI email generation'
      });
    }

    const emailPrompt = `You are an AI assistant helping with email communication for Gyandeep educational platform.

Context: ${context || 'General communication'}
Recipients: ${recipients.join(', ')}

Generate a professional email based on: ${prompt}

Format your response as:
Subject: [your subject line here]
---
[your email body here]`;

    const reply = await callGemini(emailPrompt, [], process.env.GEMINI_API_KEY);
    const [subjectLine, ...bodyParts] = reply.split('---');
    
    const generatedEmail = {
      subject: subjectLine.replace(/^Subject:\s*/i, '').trim() || `Communication from ${context || 'Gyandeep'}`,
      body: bodyParts.join('---').trim() || reply,
      recipients,
    };

    res.json({ ok: true, email: generatedEmail });
  } catch (error) {
    console.error('AI email error:', error);
    res.status(500).json({ error: 'Failed to generate email' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ 
        reply: 'AI chat requires GEMINI_API_KEY to be configured. Please set this environment variable.'
      });
    }

    const systemPrompt = `You are GyanDeep AI, a helpful educational assistant for a classroom management platform. You help students and teachers with:
- Answering questions about various subjects
- Explaining complex concepts
- Helping with study strategies
- Providing homework assistance
- Supporting classroom activities

Be friendly, encouraging, and educational in your responses.`;
    
    const chatHistory = [
      { role: 'user', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message },
    ];

    const reply = await callGemini(message, chatHistory.slice(0, -1), process.env.GEMINI_API_KEY);

    res.json({ 
      reply,
      sources: [],
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

router.post('/quiz', async (req, res) => {
  try {
    const { notesText, subject, enableThinkingMode } = req.body;
    
    if (!notesText) {
      return res.status(400).json({ error: 'Notes text is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        quiz: generateMockQuiz(subject || 'General'),
        message: 'Using demo quiz (set GEMINI_API_KEY for AI generation)',
      });
    }

    const quizPrompt = `Generate 10 multiple choice quiz questions based on the following content about ${subject || 'the topic'}:

${notesText.slice(0, 3000)}

Format as JSON array:
[
  {
    "id": "q1",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Brief explanation"
  }
]`;

    const response = await callGemini(quizPrompt, [], process.env.GEMINI_API_KEY);
    
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const quiz = JSON.parse(jsonMatch[0]);
        return res.json({ quiz, subject });
      }
    } catch (parseError) {
      console.error('Failed to parse quiz JSON:', parseError);
    }

    res.json({ quiz: generateMockQuiz(subject || 'General'), subject });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

function generateMockQuiz(subject) {
  return [
    { id: 'q1', question: `Sample question 1 about ${subject}?`, options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', explanation: 'Demo explanation' },
    { id: 'q2', question: `Sample question 2 about ${subject}?`, options: ['A', 'B', 'C', 'D'], correctAnswer: 'B', explanation: 'Demo explanation' },
    { id: 'q3', question: `Sample question 3 about ${subject}?`, options: ['A', 'B', 'C', 'D'], correctAnswer: 'C', explanation: 'Demo explanation' },
  ];
}

export default router;
