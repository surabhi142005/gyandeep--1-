import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { requireAuth } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { studentData, type } = req.body || {};
  if (!studentData) {
    return res.status(400).json({ error: 'studentData is required' });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const prompt = `Analyze the following student data and provide educational insights and recommendations.
    ${type ? `Focus on: ${type}` : ''}

    Student Data:
    ${JSON.stringify(studentData, null, 2)}

    Provide 3-5 actionable insights in JSON format: { "insights": [{ "title": string, "description": string, "priority": "high"|"medium"|"low" }] }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text;
    if (!text) {
      return res.status(200).json({ insights: [] });
    }

    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Analytics insights error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate insights' });
  }
}
