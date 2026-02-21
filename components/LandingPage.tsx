import React, { useMemo } from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
  theme: string;
}

const THEME_COLORS: Record<string, Record<string, string>> = {
  indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', gradient: 'from-indigo-600 to-indigo-800' },
  teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', gradient: 'from-teal-600 to-teal-800' },
  crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', gradient: 'from-red-600 to-red-800' },
  purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', gradient: 'from-purple-600 to-purple-800' },
};

const features = [
  { icon: '🤖', title: 'AI-Powered Quizzes', desc: 'Auto-generate quizzes from class notes using Gemini AI' },
  { icon: '📷', title: 'Face ID Login', desc: 'Secure biometric authentication with liveness detection' },
  { icon: '📍', title: 'Smart Attendance', desc: 'GPS-verified attendance marking with geofencing' },
  { icon: '🏆', title: 'Gamified Learning', desc: 'Earn XP, badges, and coins as you learn' },
  { icon: '📊', title: 'Live Analytics', desc: 'Real-time performance tracking and insights' },
  { icon: '💬', title: 'AI Chatbot', desc: 'Get instant help with a smart classroom assistant' },
];

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, theme }) => {
  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/90 shadow-xl mb-6">
          <span className="text-5xl">🕯️</span>
        </div>
        <h1 className={`text-5xl md:text-6xl font-extrabold ${colors.text} mb-4 tracking-tight`}>
          Gyandeep
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mb-2">
          AI-Powered Smart Classroom System
        </p>
        <p className="text-gray-500 max-w-lg mb-8">
          Transform your classroom with face recognition, AI quizzes, real-time attendance, and gamified learning — all in one platform.
        </p>
        <button
          onClick={onGetStarted}
          className={`${colors.primary} ${colors.hover} text-white font-bold py-4 px-10 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
        >
          Get Started
        </button>
      </div>

      {/* Features Grid */}
      <div className="px-4 pb-16 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">What makes Gyandeep special?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="bg-white/85 backdrop-blur rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow">
              <span className="text-3xl mb-3 block">{f.icon}</span>
              <h3 className="font-bold text-gray-800 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-400">
        Gyandeep — Built with React, Gemini AI &amp; Three.js
      </footer>
    </div>
  );
};

export default LandingPage;
