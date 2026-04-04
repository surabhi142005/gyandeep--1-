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

export interface GradingResult {
  score: number;
  maxScore: number;
  feedback: string;
  criteriaScores: { criterion: string; score: number; maxScore: number; comment: string }[];
  overallComment: string;
}

export async function autoGradeAnswer(
  question: string,
  correctAnswer: string,
  studentAnswer: string,
  maxScore: number = 10,
  questionType: 'mcq' | 'short' | 'long' = 'short'
): Promise<GradingResult> {
  if (!GEMINI_API_KEY) {
    return {
      score: 0,
      maxScore,
      feedback: 'AI grading is not configured. Manual review required.',
      criteriaScores: [],
      overallComment: 'Please review manually.',
    };
  }

  if (questionType === 'mcq') {
    const isCorrect = studentAnswer.toUpperCase().trim() === correctAnswer.toUpperCase().trim();
    return {
      score: isCorrect ? maxScore : 0,
      maxScore,
      feedback: isCorrect ? 'Correct answer!' : `Incorrect. The correct answer is: ${correctAnswer}`,
      criteriaScores: [{
        criterion: 'Answer Accuracy',
        score: isCorrect ? maxScore : 0,
        maxScore,
        comment: isCorrect ? 'Student selected the correct option.' : `Student selected "${studentAnswer}" instead of "${correctAnswer}".`,
      }],
      overallComment: isCorrect ? 'Full marks awarded for correct selection.' : 'No marks awarded for incorrect selection.',
    };
  }

  const prompt = `You are an AI teacher grading a student's answer.

Question: ${question}
Correct Answer: ${correctAnswer}
Student's Answer: ${studentAnswer}
Maximum Score: ${maxScore}

Grade the student's answer objectively based on:
1. Accuracy of the answer
2. Completeness
3. Understanding of concepts
4. Quality of explanation (if applicable)

Provide your response as a JSON object:
{
  "score": [numeric score between 0 and ${maxScore}],
  "feedback": "[Brief feedback on what the student got right/wrong]",
  "criteriaScores": [
    { "criterion": "[Name]", "score": [number], "maxScore": [number], "comment": "[Feedback]" }
  ],
  "overallComment": "[Summary comment for the student]"
}`;

  const response = await callGemini(prompt, [], { temperature: 0.3 });

  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.min(maxScore, Math.max(0, parsed.score || 0)),
        maxScore,
        feedback: parsed.feedback || 'Graded by AI.',
        criteriaScores: parsed.criteriaScores || [],
        overallComment: parsed.overallComment || '',
      };
    }
  } catch {
    console.error('Failed to parse grading result:', response.text);
  }

  return {
    score: Math.round(maxScore * 0.7),
    maxScore,
    feedback: 'AI grading encountered an issue. Partial credit assigned.',
    criteriaScores: [{
      criterion: 'General Assessment',
      score: Math.round(maxScore * 0.7),
      maxScore,
      comment: 'Please review manually if this score seems inaccurate.',
    }],
    overallComment: 'This answer requires manual review.',
  };
}

export async function gradeQuizSubmission(
  questions: { question: string; correctAnswer: string; maxScore: number; type: 'mcq' | 'short' | 'long' }[],
  answers: string[]
): Promise<{ totalScore: number; maxScore: number; results: GradingResult[]; overallFeedback: string }> {
  const results: GradingResult[] = [];
  
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const studentAnswer = answers[i] || '';
    const result = await autoGradeAnswer(q.question, q.correctAnswer, studentAnswer, q.maxScore, q.type);
    results.push(result);
  }

  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const maxScore = results.reduce((sum, r) => sum + r.maxScore, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let overallFeedback = '';
  if (percentage >= 90) {
    overallFeedback = 'Excellent work! You have mastered this material.';
  } else if (percentage >= 75) {
    overallFeedback = 'Good job! You have a solid understanding of the material.';
  } else if (percentage >= 60) {
    overallFeedback = 'You passed, but there is room for improvement. Review the topics you missed.';
  } else if (percentage >= 40) {
    overallFeedback = 'You need to review this material more carefully. Consider revisiting the lessons.';
  } else {
    overallFeedback = 'Significant improvement needed. Please review the material thoroughly and seek help if needed.';
  }

  return { totalScore, maxScore, results, overallFeedback };
}

export async function extractTextFromImage(imageBase64: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = 'Extract all text from this image. Preserve the structure and formatting as much as possible. If there is no readable text, describe what you see in the image.';

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: imageBase64.replace(/^data:image\/\w+;base64,/, '') } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw error;
  }
}

export default {
  generateChatResponse,
  generateContent,
  generateEmail,
  generateQuizQuestions,
  analyzeStudentPerformance,
  autoGradeAnswer,
  gradeQuizSubmission,
  extractTextFromImage,
  isAIConfigured,
};
