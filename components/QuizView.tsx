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
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  
  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    // Calculate live streak
    let streak = 0;
    for (const q of quiz) {
      const chosen = newAnswers[q.id];
      if (chosen === undefined) break;
      if (chosen === q.correctAnswer) {
        streak++;
      } else {
        streak = 0;
      }
    }
    setCurrentStreak(streak);
    if (streak > bestStreak) setBestStreak(streak);
  };

  const handleSubmit = () => {
    try {
      if (!Array.isArray(quiz) || quiz.length === 0) {
        throw new Error('No quiz available.');
      }
      let correctAnswers = 0;
      let streak = 0;
      let maxStreak = 0;
      for (const q of quiz) {
        const chosen = answers[q.id];
        if (typeof chosen === 'string' && chosen === q.correctAnswer) {
          correctAnswers++;
          streak++;
          if (streak > maxStreak) maxStreak = streak;
        } else {
          streak = 0;
        }
      }
      const finalScore = Math.round((correctAnswers / quiz.length) * 100);

      // Calculate gamification rewards
      const baseXp = Math.max(1, Math.round(finalScore));
      const streakBonus = maxStreak >= 3 ? maxStreak * 5 : 0;
      const timeBonus = timeLeft > 0 ? Math.round(timeLeft / totalTime * 20) : 0;
      const totalXp = baseXp + streakBonus + timeBonus;
      const coins = Math.floor(correctAnswers * 2) + (finalScore === 100 ? 10 : 0);

      // Determine earned badges
      const badges: string[] = [];
      if (finalScore === 100) badges.push('Perfect Score');
      if (maxStreak >= quiz.length) badges.push('Unstoppable');
      if (maxStreak >= 3) badges.push('Hot Streak');
      if (timeLeft > totalTime * 0.5) badges.push('Speed Demon');
      if (finalScore >= 80) badges.push('High Achiever');

      setBestStreak(maxStreak);
      setXpEarned(totalXp);
      setCoinsEarned(coins);
      setEarnedBadges(badges);
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
        <p className="text-lg text-gray-600 mb-2">Subject: {subject}</p>
        <p className={`text-5xl font-bold ${colors.text}`}>{score}%</p>

        {/* Gamification Rewards */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className={`p-3 rounded-lg ${colors.lightBg}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide">XP Earned</p>
            <p className={`text-2xl font-bold ${colors.text}`}>+{xpEarned}</p>
          </div>
          <div className={`p-3 rounded-lg bg-yellow-50`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Coins</p>
            <p className="text-2xl font-bold text-yellow-600">+{coinsEarned}</p>
          </div>
          <div className={`p-3 rounded-lg bg-orange-50`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Best Streak</p>
            <p className="text-2xl font-bold text-orange-600">{bestStreak}</p>
          </div>
        </div>

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Badges Earned</p>
            <div className="flex flex-wrap justify-center gap-2">
              {earnedBadges.map(badge => (
                <span key={badge} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors.lightBg} ${colors.text}`}>
                  {badge === 'Perfect Score' ? '⭐' : badge === 'Hot Streak' ? '🔥' : badge === 'Speed Demon' ? '⚡' : badge === 'Unstoppable' ? '💪' : '🏆'} {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-gray-400 text-xs mt-3">Your performance has been recorded.</p>
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
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Quiz Time: {subject}</h2>
        <div className="flex items-center gap-3">
          {currentStreak >= 2 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 animate-pulse">
              🔥 {currentStreak} streak
            </span>
          )}
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${timeLeft <= 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
            ⏱ {timeLeft}s
          </span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colors.primary}`}
          style={{ width: `${(Object.keys(answers).length / quiz.length) * 100}%` }}
        />
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
