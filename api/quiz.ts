import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { requireAuth } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { notesText, subject, enableThinkingMode } = req.body || {};
  if (!notesText || !subject) {
    return res.status(400).json({ error: 'notesText and subject are required' });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const modelName = enableThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const config: any = {
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
                question: { type: Type.STRING, description: 'The question text.' },
                options: { type: Type.ARRAY, description: 'An array of 4 possible answers.', items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING, description: 'The correct answer, which must be one of the provided options.' }
              },
              required: ['question', 'options', 'correctAnswer']
            }
          }
        },
        required: ['quiz']
      }
    };

    if (enableThinkingMode) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Based on the following class notes for the subject "${subject}", generate exactly 5 multiple-choice quiz questions. Each question must have 4 options and a single correct answer. Ensure the correct answer is one of the options.\n\nClass Notes:\n---\n${notesText}\n---`,
      config
    });

    const responseText = response.text;
    if (!responseText) {
      return res.status(500).json({ error: 'AI returned an empty response.' });
    }

    const jsonResponse = JSON.parse(responseText);
    if (!jsonResponse.quiz || jsonResponse.quiz.length === 0) {
      return res.status(500).json({ error: 'AI failed to generate a valid quiz.' });
    }

    const quiz = jsonResponse.quiz.map((q: any, index: number) => ({
      ...q,
      id: `q-${Date.now()}-${index}`
    }));

    return res.status(200).json({ quiz });
  } catch (error: any) {
    console.error('Quiz generation error:', error);
    if (error.message?.includes('SAFETY')) {
      return res.status(400).json({ error: 'Content was flagged for safety concerns.' });
    }
    return res.status(500).json({ error: error.message || 'Failed to generate quiz' });
  }
}
