/**
 * lib/ai.ts
 * Frontend AI service - delegates to backend API
 *
 * All AI calls go through the backend to keep API keys secure.
 * The backend handles provider selection (Groq/Gemini) automatically.
 */

import { extractJSONArray, extractJSONObject } from './jsonParser';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Generic API wrapper
async function aiFetch<T = any>(endpoint: string, body: any): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `AI request failed with status ${response.status}`);
  }

  return data;
}

// ── Chat ────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

export async function generateChatResponse(
  message: string,
  history: ChatMessage[] = [],
  userName?: string,
  userRole?: string
): Promise<string> {
  const data = await aiFetch<{ reply: string }>('/chat', {
    message,
    history,
    userName,
    userRole,
  });
  return data.reply;
}

// ── Quiz Generation ────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export async function generateQuizQuestions(
  notesText: string,
  subject?: string,
  count: number = 10
): Promise<QuizQuestion[]> {
  const data = await aiFetch<{ quiz: QuizQuestion[] }>('/quiz/generate', {
    notesText,
    subject,
    count,
  });
  return data.quiz;
}

// ── Email Generation ───────────────────────────────────────────

export interface GeneratedEmail {
  subject: string;
  body: string;
  recipients: string[];
}

export async function generateEmail(
  context: string,
  recipients: string[],
  additionalContext?: string
): Promise<GeneratedEmail> {
  const data = await aiFetch<{ email: GeneratedEmail }>('/ai-email', {
    prompt: context,
    recipients,
    context: additionalContext,
  });
  return data.email;
}

// ── Summarization ──────────────────────────────────────────────

export async function summarizeText(
  text: string,
  subject?: string,
  mode: 'bullets' | 'paragraph' | 'flashcards' = 'bullets'
): Promise<string> {
  const data = await aiFetch<{ result: string }>('/summarize', {
    text,
    subject,
    mode,
  });
  return data.result;
}

// ── Text Extraction (OCR) ──────────────────────────────────────

export async function extractTextFromImage(imageBase64: string): Promise<string> {
  const data = await aiFetch<{ text: string }>('/extract-text', {
    imageBase64,
  });
  return data.text;
}

// ── Grading ───────────────────────────────────────────────────

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
  // For MCQ, grade locally
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
      overallComment: isCorrect ? 'Full marks awarded.' : 'No marks awarded.',
    };
  }

  // Use backend AI for subjective grading
  const data = await aiFetch<{ results: GradingResult[] }>('/grade', {
    questions: [{ question, correctAnswer, maxScore, type: questionType }],
    answers: [studentAnswer],
  });

  return data.results[0];
}

export async function gradeQuizSubmission(
  questions: { question: string; correctAnswer: string; maxScore: number; type: 'mcq' | 'short' | 'long' }[],
  answers: string[]
): Promise<{ totalScore: number; maxScore: number; results: GradingResult[]; overallFeedback: string }> {
  // Local MCQ grading
  const results: GradingResult[] = [];
  let totalScore = 0;
  let maxScore = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const studentAnswer = answers[i] || '';

    if (q.type === 'mcq') {
      const isCorrect = studentAnswer.toUpperCase().trim() === q.correctAnswer.toUpperCase().trim();
      const score = isCorrect ? q.maxScore : 0;
      totalScore += score;
      maxScore += q.maxScore;
      results.push({
        score,
        maxScore: q.maxScore,
        feedback: isCorrect ? 'Correct!' : `Incorrect. Answer: ${q.correctAnswer}`,
        criteriaScores: [{ criterion: 'Answer', score, maxScore: q.maxScore, comment: isCorrect ? 'Correct.' : `Wrong.` }],
        overallComment: isCorrect ? 'Full marks.' : 'No marks.',
      });
    } else {
      results.push({
        score: 0,
        maxScore: q.maxScore,
        feedback: 'Pending AI grading',
        criteriaScores: [],
        overallComment: '',
      });
    }
  }

  // Batch grade non-MCQ questions via API
  const nonMcqQuestions = questions.filter(q => q.type !== 'mcq');
  const nonMcqAnswers = answers.filter((_, i) => questions[i].type !== 'mcq');

  if (nonMcqQuestions.length > 0) {
    try {
      const data = await aiFetch<{ results: GradingResult[]; totalScore: number; maxScore: number }>('/grade', {
        questions: nonMcqQuestions,
        answers: nonMcqAnswers,
      });

      let resultIndex = 0;
      for (let i = 0; i < questions.length; i++) {
        if (questions[i].type !== 'mcq') {
          results[i] = data.results[resultIndex++];
          totalScore += results[i].score;
          maxScore += results[i].maxScore;
        }
      }
    } catch (err) {
      console.warn('AI grading failed, showing pending:', err);
    }
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  let overallFeedback = 'Significant review needed.';
  if (percentage >= 90) overallFeedback = 'Excellent work!';
  else if (percentage >= 75) overallFeedback = 'Good job!';
  else if (percentage >= 60) overallFeedback = 'Passed. Review missed topics.';
  else if (percentage >= 40) overallFeedback = 'Needs improvement.';

  return { totalScore, maxScore, results, overallFeedback };
}

// ── Utility ───────────────────────────────────────────────────

export function isAIConfigured(): boolean {
  // AI status is determined server-side
  return true;
}

export default {
  generateChatResponse,
  generateQuizQuestions,
  generateEmail,
  summarizeText,
  extractTextFromImage,
  autoGradeAnswer,
  gradeQuizSubmission,
  isAIConfigured,
};