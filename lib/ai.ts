/**
 * lib/ai.ts
 * Gemini AI integration for chat and content generation
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface AIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_CONFIG: AIConfig = {
  model: 'gemini-2.0-flash',
  temperature: 0.7,
  maxTokens: 2048,
};

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface AIResponse {
  text: string;
  candidates?: any[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

async function callGemini(
  prompt: string,
  messages: ChatMessage[] = [],
  config: AIConfig = {}
): Promise<AIResponse> {
  const { model, temperature, maxTokens } = { ...DEFAULT_CONFIG, ...config };

  const contents = [
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: prompt }] },
  ];

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      text,
      candidates: data.candidates,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount,
      } : undefined,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

export async function generateChatResponse(
  message: string,
  history: ChatMessage[] = [],
  config?: AIConfig
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return 'AI chat is not configured. Please set GEMINI_API_KEY in your environment variables.';
  }

  const response = await callGemini(message, history, config);
  return response.text;
}

export async function generateContent(
  prompt: string,
  config?: AIConfig
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const response = await callGemini(prompt, [], config);
  return response.text;
}

export async function generateEmail(
  context: string,
  recipients: string[],
  additionalContext?: string
): Promise<{ subject: string; body: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = `You are an AI assistant helping with email communication.

Context: ${context}
Recipients: ${recipients.join(', ')}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Generate a professional email with:
1. A clear, concise subject line
2. A well-structured body that is appropriate and professional

Format your response as:
Subject: [your subject line here]
---
[your email body here]`;

  const response = await callGemini(prompt, [], { temperature: 0.5 });
  const [subjectLine, ...bodyParts] = response.text.split('---');
  
  return {
    subject: subjectLine.replace(/^Subject:\s*/i, '').trim(),
    body: bodyParts.join('---').trim(),
  };
}

export async function generateQuizQuestions(
  topic: string,
  count: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<any[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = `Generate ${count} quiz questions about "${topic}" with ${difficulty} difficulty.

For each question, provide:
- The question text
- 4 multiple choice options (A, B, C, D)
- The correct answer
- A brief explanation

Format as JSON array:
[
  {
    "question": "...",
    "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
    "correctAnswer": "A",
    "explanation": "..."
  }
]`;

  const response = await callGemini(prompt, [], { temperature: 0.3 });
  
  try {
    const jsonMatch = response.text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch {
    console.error('Failed to parse quiz questions:', response.text);
    return [];
  }
}

export async function analyzeStudentPerformance(
  grades: { score: number; maxScore: number; subject: string }[],
  attendance: { present: number; total: number },
  behavior?: any
): Promise<{
  insights: { type: string; message: string; priority: 'high' | 'medium' | 'low' }[];
  recommendations: string[];
  summary: string;
}> {
  if (!GEMINI_API_KEY) {
    return {
      insights: [{ type: 'info', message: 'Configure GEMINI_API_KEY for AI-powered insights', priority: 'low' }],
      recommendations: [],
      summary: 'AI insights are not available. Please configure Gemini API.',
    };
  }

  const prompt = `Analyze the following student data and provide insights:

Grades:
${grades.map(g => `- ${g.subject}: ${g.score}/${g.maxScore} (${Math.round(g.score/g.maxScore*100)}%)`).join('\n')}

Attendance: ${attendance.present}/${attendance.total} days (${Math.round(attendance.present/attendance.total*100)}%)

${behavior ? `Behavior: ${JSON.stringify(behavior)}` : ''}

Provide a JSON response with:
{
  "insights": [{ "type": "achievement|improvement|warning|info", "message": "...", "priority": "high|medium|low" }],
  "recommendations": ["..."],
  "summary": "..."
}`;

  const response = await callGemini(prompt, [], { temperature: 0.3 });
  
  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {
      insights: [],
      recommendations: [],
      summary: response.text,
    };
  } catch {
    return {
      insights: [],
      recommendations: [],
      summary: response.text,
    };
  }
}

export function isAIConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

export default {
  generateChatResponse,
  generateContent,
  generateEmail,
  generateQuizQuestions,
  analyzeStudentPerformance,
  isAIConfigured,
};
