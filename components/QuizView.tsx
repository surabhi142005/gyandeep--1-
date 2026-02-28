import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizQuestion } from '../types';

interface QuizViewProps {
  quiz: QuizQuestion[];
  subject: string;
  onSubmit: (score: number) => void;
  theme: string;
}

const THEME_COLORS: Record<string, Record<string, string>> = {
  indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500', border: 'border-indigo-500', lightBg: 'bg-indigo-100', gradient: 'from-indigo-500 to-purple-600' },
  teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500', border: 'border-teal-500', lightBg: 'bg-teal-100', gradient: 'from-teal-500 to-cyan-600' },
  crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500', border: 'border-red-500', lightBg: 'bg-red-100', gradient: 'from-red-500 to-rose-600' },
  purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500', border: 'border-purple-500', lightBg: 'bg-purple-100', gradient: 'from-purple-500 to-pink-600' },
};

// Circular timer ring component
const TimerRing: React.FC<{ timeLeft: number; totalTime: number; danger: boolean }> = ({ timeLeft, totalTime, danger }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / totalTime;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <motion.circle
          cx="28" cy="28" r={radius} fill="none"
          stroke={danger ? '#ef4444' : '#6366f1'}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          animate={danger ? { stroke: ['#ef4444', '#f97316', '#ef4444'] } : {}}
          transition={danger ? { duration: 0.5, repeat: Infinity } : {}}
        />
      </svg>
      <div className={`absolute text-sm font-bold ${danger ? 'text-red-500' : 'text-gray-700'}`}>
        {timeLeft}s
      </div>
    </div>
  );
};

// Confetti particles
const ConfettiParticle: React.FC<{ index: number }> = ({ index }) => {
  const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'];
  const color = colors[index % colors.length];
  const x = (Math.random() - 0.5) * 400;
  const rotate = Math.random() * 720 - 360;

  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ backgroundColor: color, left: '50%', top: '50%' }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x: x,
        y: -(Math.random() * 300 + 100),
        opacity: 0,
        scale: Math.random() * 0.5 + 0.5,
        rotate: rotate,
      }}
      transition={{ duration: 1.5 + Math.random(), ease: 'easeOut' }}
    />
  );
};

// XP fly animation
const XPFlyIn: React.FC<{ amount: number }> = ({ amount }) => (
  <motion.div
    initial={{ y: 0, opacity: 1, scale: 1 }}
    animate={{ y: -80, opacity: 0, scale: 1.5 }}
    transition={{ duration: 1.2, ease: 'easeOut' }}
    className="absolute top-0 left-1/2 -translate-x-1/2 text-2xl font-extrabold text-indigo-600 pointer-events-none whitespace-nowrap"
  >
    +{amount} XP
  </motion.div>
);

// Badge earned animation
const BadgeEarned: React.FC<{ badge: string; icon: string; delay: number }> = ({ badge, icon, delay }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0, rotate: -180 }}
    animate={{ scale: 1, opacity: 1, rotate: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 15, delay }}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 shadow-lg"
  >
    <span className="text-2xl">{icon}</span>
    <span className="font-bold text-amber-700 text-sm">{badge}</span>
  </motion.div>
);

const BADGE_ICONS: Record<string, string> = {
  'Perfect Score': '⭐',
  'Hot Streak': '🔥',
  'Speed Demon': '⚡',
  'Unstoppable': '💪',
  'High Achiever': '🏆',
};

const QuizView: React.FC<QuizViewProps> = ({ quiz, subject, onSubmit, theme }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [showXpFly, setShowXpFly] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);
  const currentQ = quiz[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / quiz.length) * 100;

  const handleAnswerChange = useCallback((questionId: string, answer: string) => {
    setSelectedOption(answer);
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

    // Auto-advance after selection
    setTimeout(() => {
      if (currentQuestion < quiz.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedOption(null);
      }
    }, 500);
  }, [answers, quiz, currentQuestion, bestStreak]);

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
      setShowConfetti(true);
      setShowXpFly(true);
      onSubmit(finalScore);

      setTimeout(() => setShowConfetti(false), 3000);
      setTimeout(() => setShowXpFly(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Failed to submit quiz.');
    }
  };

  const getOptionBgClass = (question: QuizQuestion, option: string) => {
    if (!submitted) {
      return answers[question.id] === option
        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-400 shadow-md ring-2 ring-indigo-200'
        : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-indigo-300 hover:shadow-sm';
    }
    if (option === question.correctAnswer) {
      return 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400 shadow-md';
    }
    if (answers[question.id] === option && option !== question.correctAnswer) {
      return 'bg-gradient-to-r from-red-50 to-rose-50 border-red-400 shadow-md';
    }
    return 'bg-gray-50 border-gray-200 opacity-60';
  };

  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTs) / 1000);
      const remaining = Math.max(0, totalTime - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) {
        handleSubmit();
      }
    }, 500);
    return () => clearInterval(id);
  }, [submitted, startTs, totalTime]);

  if (!Array.isArray(quiz) || quiz.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl text-center border border-gray-100">
        <span className="text-6xl block mb-4">📝</span>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Unavailable</h2>
        <p className="text-gray-500">No questions were provided for {subject}.</p>
      </div>
    );
  }

  // Results screen
  if (submitted) {
    return (
      <div className="relative">
        {/* Confetti */}
        {showConfetti && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
            {Array.from({ length: 30 }).map((_, i) => (
              <ConfettiParticle key={i} index={i} />
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-gray-100 text-center relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-purple-50/50 pointer-events-none" />

          <div className="relative z-10">
            {/* Score circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
              className="relative inline-flex items-center justify-center mb-6"
            >
              <svg className="w-36 h-36" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <motion.circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52}
                  animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - score / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                  className="-rotate-90 origin-center"
                  style={{ transformOrigin: '60px 60px' }}
                />
              </svg>
              <div className="absolute">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
                >
                  {score}%
                </motion.p>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-bold text-gray-800 mb-1"
            >
              {score >= 80 ? 'Outstanding!' : score >= 50 ? 'Good Job!' : 'Keep Practicing!'}
            </motion.h2>
            <p className="text-gray-500 mb-6">Subject: {subject}</p>

            {/* XP fly animation */}
            {showXpFly && <XPFlyIn amount={xpEarned} />}

            {/* Rewards grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-3 mb-6"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100"
              >
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">XP Earned</p>
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.8 }}
                  className="text-2xl font-extrabold text-indigo-600"
                >
                  +{xpEarned}
                </motion.p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-yellow-50 to-amber-50 border border-amber-100"
              >
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Coins</p>
                <motion.p
                  initial={{ scale: 0, rotateY: 0 }}
                  animate={{ scale: 1, rotateY: 360 }}
                  transition={{ type: 'spring', delay: 1 }}
                  className="text-2xl font-extrabold text-amber-600"
                >
                  +{coinsEarned}
                </motion.p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100"
              >
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Best Streak</p>
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 1.2 }}
                  className="text-2xl font-extrabold text-orange-600"
                >
                  🔥 {bestStreak}
                </motion.p>
              </motion.div>
            </motion.div>

            {/* Earned Badges */}
            {earnedBadges.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mb-6"
              >
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Badges Earned</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {earnedBadges.map((badge, i) => (
                    <BadgeEarned
                      key={badge}
                      badge={badge}
                      icon={BADGE_ICONS[badge] || '🏅'}
                      delay={1.2 + i * 0.2}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Review toggle */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              onClick={() => setShowReview(!showReview)}
              className="text-indigo-600 font-semibold text-sm hover:underline mb-4 inline-flex items-center gap-1"
            >
              {showReview ? 'Hide Review' : 'Review Answers'}
              <svg className={`w-4 h-4 transition-transform ${showReview ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.button>

            {/* Answer review */}
            <AnimatePresence>
              {showReview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-4 text-left">
                    {quiz.map((q, idx) => (
                      <div key={q.id} className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                        <p className="font-semibold text-gray-800 mb-3 flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          {q.question}
                        </p>
                        <div className="space-y-2 ml-8">
                          {q.options.map(option => (
                            <div key={option} className={`p-2.5 border rounded-xl text-sm transition-all ${getOptionBgClass(q, option)}`}>
                              <span className="flex items-center gap-2">
                                {option === q.correctAnswer && <span className="text-emerald-500">✓</span>}
                                {answers[q.id] === option && option !== q.correctAnswer && <span className="text-red-500">✗</span>}
                                {option}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active quiz screen - question by question
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              🎮 Quiz: {subject}
            </h2>
            <p className="text-indigo-200 text-xs mt-0.5">
              Question {currentQuestion + 1} of {quiz.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Streak indicator */}
            <AnimatePresence>
              {currentStreak >= 2 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur"
                >
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    🔥
                  </motion.span>
                  <span className="font-bold text-sm">{currentStreak}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <TimerRing timeLeft={timeLeft} totalTime={totalTime} danger={timeLeft <= 10} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full bg-white/20 rounded-full h-2">
          <motion.div
            className="h-2 rounded-full bg-white"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question navigation dots */}
      <div className="px-6 pt-4 pb-2 flex items-center justify-center gap-1.5 flex-wrap">
        {quiz.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => { setCurrentQuestion(idx); setSelectedOption(null); }}
            className={`w-8 h-8 rounded-full text-xs font-bold transition-all duration-200 ${idx === currentQuestion
                ? 'bg-indigo-600 text-white shadow-lg scale-110'
                : answers[q.id]
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      {/* Question content */}
      <div className="px-6 py-6">
        {error && (
          <div className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <p className="font-bold text-gray-800 text-lg mb-6 leading-relaxed">
              {currentQ.question}
            </p>
            <div className="space-y-3">
              {currentQ.options.map((option, oidx) => (
                <motion.label
                  key={option}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: oidx * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${getOptionBgClass(currentQ, option)}`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${answers[currentQ.id] === option
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-gray-300'
                    }`}>
                    {answers[currentQ.id] === option && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-white"
                      />
                    )}
                  </div>
                  <input
                    type="radio"
                    name={currentQ.id}
                    value={option}
                    checked={answers[currentQ.id] === option}
                    onChange={() => handleAnswerChange(currentQ.id, option)}
                    className="sr-only"
                  />
                  <span className="text-gray-700 font-medium">{option}</span>
                </motion.label>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation footer */}
      <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={() => { setCurrentQuestion(prev => Math.max(0, prev - 1)); setSelectedOption(null); }}
          disabled={currentQuestion === 0}
          className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <span className="text-xs text-gray-400 font-medium">
          {answeredCount}/{quiz.length} answered
        </span>

        {currentQuestion < quiz.length - 1 ? (
          <button
            onClick={() => { setCurrentQuestion(prev => prev + 1); setSelectedOption(null); }}
            className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={answeredCount !== quiz.length}
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r ${colors.gradient}`}
          >
            Submit Quiz
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default QuizView;
