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

  const { prompt, location, model } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const modelName = model === 'fast' ? 'gemini-flash-lite-latest' : 'gemini-2.5-flash';
    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: location.lat,
            longitude: location.lng
          }
        }
      };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config
    });

    const text = response.text || 'Sorry, I could not generate a response.';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const sources = groundingChunks
      .filter((chunk: any) => chunk.maps)
      .flatMap((chunk: any) => {
        const found: any[] = [];
        if (chunk.maps.uri && chunk.maps.title) {
          found.push({ uri: chunk.maps.uri, title: chunk.maps.title });
        }
        if (chunk.maps.placeAnswerSources?.reviewSnippets) {
          for (const snippet of chunk.maps.placeAnswerSources.reviewSnippets) {
            if (snippet.uri && snippet.title) {
              found.push({ uri: snippet.uri, title: snippet.title });
            }
          }
        }
        return found;
      })
      .filter((s: any, i: number, arr: any[]) => i === arr.findIndex((x: any) => x.uri === s.uri));

    return res.status(200).json({ text, sources });
  } catch (error: any) {
    console.error('Chat error:', error);
    if (error.message?.includes('SAFETY')) {
      return res.status(400).json({ error: 'Response blocked due to safety concerns.' });
    }
    return res.status(500).json({ error: error.message || 'Failed to get response' });
  }
}
