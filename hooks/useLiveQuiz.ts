/**
 * hooks/useLiveQuiz.ts
 * Real-time quiz submission and results
 */

import { useState, useEffect, useCallback } from 'react';
import { realtimeClient } from '../services/realtimeClient';

interface QuizSubmission {
  id: string;
  studentId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  submittedAt: Date;
  answers: Record<string, string>;
  xpAwarded: number;
}

interface QuizState {
  isActive: boolean;
  currentQuestion: number;
  totalQuestions: number;
  submissions: QuizSubmission[];
  startTime: Date | null;
}

interface UseLiveQuizOptions {
  sessionId: string;
  isTeacher?: boolean;
}

export function useLiveQuiz({ sessionId, isTeacher = false }: UseLiveQuizOptions) {
  const [state, setState] = useState<QuizState>({
    isActive: false,
    currentQuestion: 0,
    totalQuestions: 0,
    submissions: [],
    startTime: null,
  });
  const [studentProgress, setStudentProgress] = useState<Record<string, number>>({});
  const [lastSubmission, setLastSubmission] = useState<QuizSubmission | null>(null);

  // WebSocket listeners for quiz events
  useEffect(() => {
    if (!sessionId) return;

    const room = `session-${sessionId}`;
    realtimeClient.joinRoom(room);

    // Listen for quiz state changes
    const unsubQuizState = realtimeClient.on('quiz-update', (data) => {
      switch (data.type) {
        case 'started':
          setState(prev => ({
            ...prev,
            isActive: true,
            currentQuestion: 0,
            totalQuestions: data.questionCount || 0,
            startTime: new Date(),
            submissions: [],
          }));
          break;
        case 'ended':
          setState(prev => ({
            ...prev,
            isActive: false,
            currentQuestion: 0,
          }));
          break;
        case 'next_question':
          setState(prev => ({
            ...prev,
            currentQuestion: data.questionIndex || prev.currentQuestion + 1,
          }));
          break;
      }
    });

    // Listen for quiz submissions
    const unsubSubmission = realtimeClient.on('quiz_submission', (data) => {
      console.log('[Quiz] Submission received:', data);

      const submission: QuizSubmission = {
        id: data.attemptId || `temp-${Date.now()}`,
        studentId: data.studentId,
        studentName: data.studentName || 'Student',
        score: data.score,
        totalQuestions: data.totalQuestions,
        correctCount: data.correctCount,
        submittedAt: new Date(),
        answers: data.answers || {},
        xpAwarded: data.xpAwarded || 0,
      };

      setState(prev => {
        const existingIndex = prev.submissions.findIndex(s => s.studentId === data.studentId);
        let newSubmissions;

        if (existingIndex >= 0) {
          newSubmissions = [...prev.submissions];
          newSubmissions[existingIndex] = submission;
        } else {
          newSubmissions = [...prev.submissions, submission];
        }

        return { ...prev, submissions: newSubmissions };
      });

      setLastSubmission(submission);
    });

    // Listen for student progress updates
    const unsubProgress = realtimeClient.on('quiz_progress', (data) => {
      setStudentProgress(prev => ({
        ...prev,
        [data.studentId]: data.question + 1,
      }));
    });

    return () => {
      unsubQuizState();
      unsubSubmission();
      unsubProgress();
      realtimeClient.leaveRoom(room);
    };
  }, [sessionId]);

  // Submit quiz (student action)
  const submitQuiz = useCallback(
    async (answers: Record<string, string>, studentId: string) => {
      if (!sessionId) throw new Error('No active session');

      const response = await fetch(`/api/sessions/${sessionId}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          answers: Object.entries(answers).map(([_, answer], index) => ({
            questionIndex: index,
            answer,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit quiz');
      }

      const result = await response.json();
      return result;
    },
    [sessionId]
  );

  // Start quiz (teacher action)
  const startQuiz = useCallback(
    async (questions: any[]) => {
      if (!sessionId) throw new Error('No active session');

      const response = await fetch(`/api/sessions/${sessionId}/quiz/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start quiz');
      }

      return await response.json();
    },
    [sessionId]
  );

  // End quiz (teacher action)
  const endQuiz = useCallback(async () => {
    if (!sessionId) throw new Error('No active session');

    const response = await fetch(`/api/sessions/${sessionId}/quiz/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to end quiz');
    }

    return await response.json();
  }, [sessionId]);

  // Advance to next question (teacher action)
  const nextQuestion = useCallback(async () => {
    if (!sessionId) throw new Error('No active session');

    await fetch(`/api/sessions/${sessionId}/quiz/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIndex: state.currentQuestion + 1 }),
    });
  }, [sessionId, state.currentQuestion]);

  // Get completion rate
  const completionRate =
    state.submissions.length > 0
      ? Math.round(
          (state.submissions.filter(s => s.score >= 0).length / state.submissions.length) * 100
        )
      : 0;

  // Get average score
  const averageScore =
    state.submissions.length > 0
      ? Math.round(state.submissions.reduce((sum, s) => sum + s.score, 0) / state.submissions.length)
      : 0;

  return {
    ...state,
    studentProgress,
    lastSubmission,
    completionRate,
    averageScore,
    submitQuiz,
    startQuiz,
    endQuiz,
    nextQuestion,
  };
}
