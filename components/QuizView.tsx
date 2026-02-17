import React, { useState, useMemo, useEffect } from 'react';
import type { QuizQuestion } from '../types';

interface QuizViewProps {
  quiz: QuizQuestion[];
  subject: string;
  onSubmit: (score: number) => void;
  theme: string;
}

const THEME_COLORS: Record<string, Record<string, string>> = {
    indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500', border: 'border-indigo-500', lightBg: 'bg-indigo-100' },
    teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500', border: 'border-teal-500', lightBg: 'bg-teal-100' },
    crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500', border: 'border-red-500', lightBg: 'bg-red-100' },
    purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500', border: 'border-purple-500', lightBg: 'bg-purple-100' },
};

const QuizView: React.FC<QuizViewProps> = ({ quiz, subject, onSubmit, theme }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [startTs] = useState<number>(Date.now());
  const totalTime = quiz.length * 20;
  const [timeLeft, setTimeLeft] = useState<number>(totalTime);
  
  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    try {
      if (!Array.isArray(quiz) || quiz.length === 0) {
        throw new Error('No quiz available.');
      }
      let correctAnswers = 0;
      for (const q of quiz) {
        const chosen = answers[q.id];
        if (typeof chosen === 'string' && chosen === q.correctAnswer) {
          correctAnswers++;
        }
      }
      const finalScore = Math.round((correctAnswers / quiz.length) * 100);
      setScore(finalScore);
      setSubmitted(true);
      onSubmit(finalScore);
    } catch (e: any) {
      setError(e.message || 'Failed to submit quiz.');
    }
  };

  const getOptionBgClass = (question: QuizQuestion, option: string) => {
    if (!submitted) {
      return answers[question.id] === option ? `${colors.lightBg} ${colors.border}` : 'bg-white hover:bg-gray-50';
    }
    if (option === question.correctAnswer) {
      return 'bg-green-100 border-green-500';
    }
    if (answers[question.id] === option && option !== question.correctAnswer) {
      return 'bg-red-100 border-red-500';
    }
    return 'bg-gray-100';
  };

  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTs) / 1000);
      setTimeLeft(Math.max(0, totalTime - elapsed));
    }, 500);
    return () => clearInterval(id);
  }, [submitted, startTs, totalTime]);

  if (!Array.isArray(quiz) || quiz.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Unavailable</h2>
        <p className="text-gray-600">No questions were provided for {subject}.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Completed!</h2>
        <p className="text-lg text-gray-600 mb-4">Subject: {subject}</p>
        <p className={`text-4xl font-bold ${colors.text}`}>{score}%</p>
        <p className="text-gray-500 mt-2">Your performance has been recorded.</p>
        <div className="mt-4 text-sm text-gray-600">Max streak: {quiz.reduce((max, q) => {
          return Math.max(max, answers[q.id] === q.correctAnswer ? max + 1 : 0);
        }, 0)}</div>
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4 text-left">Review Your Answers:</h3>
          {quiz.map((q) => (
            <div key={q.id} className="mb-4 text-left p-4 rounded-lg bg-gray-50">
              <p className="font-semibold text-gray-800">{q.question}</p>
              <div className="mt-2 space-y-2">
                {q.options.map(option => (
                  <div key={option} className={`p-2 border rounded-md ${getOptionBgClass(q, option)}`}>
                    {option}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Quiz Time: {subject}</h2>
        <div className="text-sm font-semibold text-gray-700">Time Left: {timeLeft}s</div>
      </div>
      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-2 rounded-md">{error}</p>}
      {quiz.map((q, index) => (
        <div key={q.id} className="mb-6">
          <p className="font-semibold text-gray-700 mb-2">{index + 1}. {q.question}</p>
          <div className="space-y-2">
            {q.options.map(option => (
              <label key={option} className={`block p-3 border rounded-lg cursor-pointer transition-all ${getOptionBgClass(q, option)}`}>
                <input
                  type="radio"
                  name={q.id}
                  value={option}
                  checked={answers[q.id] === option}
                  onChange={() => handleAnswerChange(q.id, option)}
                  className={`mr-3 ${colors.ring}`}
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={handleSubmit}
        disabled={Object.keys(answers).length !== quiz.length}
        className={`w-full text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${colors.primary} ${colors.hover}`}
      >
        Submit Quiz
      </button>
    </div>
  );
};

export default QuizView;
