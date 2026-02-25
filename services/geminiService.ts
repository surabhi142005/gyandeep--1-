import type { QuizQuestion, Coordinates } from '../types';

export interface ChatbotResponse {
  text: string;
  sources: Array<{ uri: string, title: string }>;
}

export interface QuizGenerationOptions {
  notesText: string;
  subject: string;
  enableThinkingMode: boolean;
}

const getApiBase = () => import.meta.env.VITE_API_URL || '';

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Try Supabase session first, then fall back to localStorage JWT
  let token: string | null = null;
  try {
    const { supabase } = await import('./supabaseClient');
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token ?? null;
  } catch { /* supabase not configured */ }
  if (!token) token = localStorage.getItem('gyandeep_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const generateQuizFromNotes = async ({ notesText, subject, enableThinkingMode }: QuizGenerationOptions): Promise<QuizQuestion[]> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBase()}/api/quiz`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ notesText, subject, enableThinkingMode })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate quiz');
  }

  const data = await res.json();
  return data.quiz || data;
};

export interface ChatbotRequest {
    prompt: string;
    location: Coordinates | null;
    model: 'fast' | 'smart';
}

export const getChatbotResponse = async ({ prompt, location, model }: ChatbotRequest): Promise<ChatbotResponse> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBase()}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, location, model })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get chatbot response');
  }

  return res.json();
};
