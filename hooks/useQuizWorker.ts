/**
 * hooks/useQuizWorker.ts
 *
 * Wraps public/workers/quizWorker.js for off-main-thread quiz generation
 * and note summarization.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { QuizQuestion } from '../types';
import { getStoredToken } from '../services/authService';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface QuizWorkerState {
  isGenerating: boolean;
  isSummarizing: boolean;
  progress: string | null;
  error: string | null;
}

interface GenerateQuizOptions {
  notesText: string;
  subject: string;
}

interface SummarizeOptions {
  text: string;
  subject: string;
  mode?: 'bullets' | 'paragraph' | 'flashcards';
}

export function useQuizWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<QuizWorkerState>({
    isGenerating: false,
    isSummarizing: false,
    progress: null,
    error: null,
  });

  // Resolve/reject refs for current pending operation
  const resolveRef = useRef<((v: any) => void) | null>(null);
  const rejectRef = useRef<((e: Error) => void) | null>(null);

  useEffect(() => {
    const worker = new Worker('/workers/quizWorker.js');
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;

      if (type === 'PROGRESS') {
        setState(s => ({ ...s, progress: payload.message }));
        return;
      }

      if (type === 'QUIZ_RESULT') {
        setState(s => ({ ...s, isGenerating: false, progress: null, error: null }));
        resolveRef.current?.({ quiz: payload.quiz, fromCache: payload.fromCache });
        resolveRef.current = null;
        return;
      }

      if (type === 'SUMMARY_RESULT') {
        setState(s => ({ ...s, isSummarizing: false, progress: null, error: null }));
        resolveRef.current?.(payload.result);
        resolveRef.current = null;
        return;
      }

      if (type === 'ERROR') {
        setState(s => ({
          ...s,
          isGenerating: false,
          isSummarizing: false,
          progress: null,
          error: payload.message,
        }));
        rejectRef.current?.(new Error(payload.message));
        rejectRef.current = null;
      }
    };

    worker.onerror = (e) => {
      const msg = e.message || 'Worker crashed';
      setState(s => ({ ...s, isGenerating: false, isSummarizing: false, error: msg }));
      rejectRef.current?.(new Error(msg));
      rejectRef.current = null;
    };

    return () => {
      worker.terminate();
    };
  }, []);

  const generateQuiz = useCallback(
    ({ notesText, subject }: GenerateQuizOptions): Promise<{ quiz: QuizQuestion[]; fromCache: boolean }> => {
      if (!workerRef.current) return Promise.reject(new Error('Worker not ready'));

      setState(s => ({ ...s, isGenerating: true, error: null, progress: 'Preparing...' }));

      return new Promise((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;
        workerRef.current!.postMessage({
          type: 'GENERATE_QUIZ',
          payload: { notesText, subject, token: getStoredToken(), apiBase: API_BASE },
        });
      });
    },
    [],
  );

  const summarize = useCallback(
    ({ text, subject, mode = 'bullets' }: SummarizeOptions): Promise<any> => {
      if (!workerRef.current) return Promise.reject(new Error('Worker not ready'));

      setState(s => ({ ...s, isSummarizing: true, error: null, progress: 'Preparing...' }));

      return new Promise((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;
        workerRef.current!.postMessage({
          type: 'SUMMARIZE',
          payload: { text, subject, mode, token: getStoredToken(), apiBase: API_BASE },
        });
      });
    },
    [],
  );

  const clearError = useCallback(() => setState(s => ({ ...s, error: null })), []);

  return {
    generateQuiz,
    summarize,
    isGenerating: state.isGenerating,
    isSummarizing: state.isSummarizing,
    progress: state.progress,
    error: state.error,
    clearError,
  };
}
