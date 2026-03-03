import React, { useMemo, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

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
  { icon: '🤖', title: 'AI-Powered Quizzes', desc: 'Auto-generate quizzes from class notes using Gemini AI', color: 'from-blue-500/10 to-indigo-500/10', border: 'border-blue-200/50' },
  { icon: '📷', title: 'Face ID Login', desc: 'Secure biometric authentication with liveness detection', color: 'from-purple-500/10 to-pink-500/10', border: 'border-purple-200/50' },
  { icon: '📍', title: 'Smart Attendance', desc: 'GPS-verified attendance marking with geofencing', color: 'from-green-500/10 to-emerald-500/10', border: 'border-green-200/50' },
  { icon: '🏆', title: 'Gamified Learning', desc: 'Earn XP, badges, and coins as you learn and compete', color: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-200/50' },
  { icon: '📊', title: 'Live Analytics', desc: 'Real-time performance tracking and insights dashboard', color: 'from-cyan-500/10 to-teal-500/10', border: 'border-cyan-200/50' },
  { icon: '💬', title: 'AI Chatbot', desc: 'Get instant help with a smart classroom assistant', color: 'from-rose-500/10 to-red-500/10', border: 'border-rose-200/50' },
];

const scenes = [
  {
    emoji: '📚',
    title: 'Upload Your Notes',
    desc: 'Teachers upload class notes and AI instantly processes them into structured content.',
    visual: 'bg-gradient-to-br from-blue-100 to-indigo-100',
  },
  {
    emoji: '🧠',
    title: 'AI Generates Quizzes',
    desc: 'Gemini AI creates personalized quiz questions tailored to the material.',
    visual: 'bg-gradient-to-br from-purple-100 to-pink-100',
  },
  {
    emoji: '🎮',
    title: 'Students Compete',
    desc: 'Gamified quiz experience with timers, streaks, XP, coins, and leaderboards.',
    visual: 'bg-gradient-to-br from-amber-100 to-orange-100',
  },
  {
    emoji: '📈',
    title: 'Track Progress',
    desc: 'Real-time analytics show learning pathways and personalized recommendations.',
    visual: 'bg-gradient-to-br from-emerald-100 to-teal-100',
  },
];

const FeatureCard: React.FC<{ feature: typeof features[0]; index: number }> = ({ feature, index }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className={`relative group bg-gradient-to-br ${feature.color} backdrop-blur-sm rounded-2xl border ${feature.border} p-6 hover:shadow-xl transition-shadow duration-300`}
    >
      <div className="absolute inset-0 rounded-2xl bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <motion.span
          className="text-4xl block mb-4"
          whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.4 }}
        >
          {feature.icon}
        </motion.span>
        <h3 className="font-bold text-gray-800 text-lg mb-2">{feature.title}</h3>
        <p className="text-sm text-gray-700 leading-relaxed">{feature.desc}</p>
      </div>
    </motion.div>
  );
};

const ScrollScene: React.FC<{ scene: typeof scenes[0]; index: number }> = ({ scene, index }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const isEven = index % 2 === 0;

  return (
    <motion.div
      ref={ref}
      className={`flex items-center gap-8 md:gap-16 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} flex-col`}
    >
      <motion.div
        initial={{ opacity: 0, x: isEven ? -60 : 60 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="flex-1 text-center md:text-left"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold mb-4">
          Step {index + 1}
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">{scene.title}</h3>
        <p className="text-gray-700 text-lg leading-relaxed max-w-md">{scene.desc}</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: isEven ? 60 : -60 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
        className="flex-1"
      >
        <div className={`${scene.visual} rounded-3xl p-12 flex items-center justify-center shadow-inner`}>
          <motion.span
            className="text-8xl"
            animate={isInView ? { scale: [0.5, 1.1, 1], rotate: [0, 5, 0] } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {scene.emoji}
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  );
};

const FloatingParticle: React.FC<{ delay: number; x: string; size: string }> = ({ delay, x, size }) => (
  <motion.div
    className={`absolute ${x} rounded-full bg-indigo-400/20`}
    style={{ width: size, height: size }}
    animate={{
      y: [0, -30, 0],
      opacity: [0.3, 0.7, 0.3],
      scale: [1, 1.2, 1],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

const StatCounter: React.FC<{ value: string; label: string; delay: number }> = ({ value, label, delay }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-sm text-gray-700 mt-1">{label}</div>
    </motion.div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, theme }) => {
  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div className="min-h-screen overflow-hidden bg-white/60 backdrop-blur-sm">
      {/* Hero Section with Parallax */}
      <div ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 py-20 overflow-hidden">
        {/* Floating particles */}
        <FloatingParticle delay={0} x="top-20 left-[10%]" size="12px" />
        <FloatingParticle delay={1} x="top-40 right-[15%]" size="8px" />
        <FloatingParticle delay={2} x="bottom-32 left-[20%]" size="16px" />
        <FloatingParticle delay={0.5} x="top-60 right-[25%]" size="10px" />
        <FloatingParticle delay={1.5} x="bottom-48 right-[10%]" size="14px" />
        <FloatingParticle delay={3} x="top-32 left-[40%]" size="6px" />

        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl" />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="relative z-10"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white/90 shadow-2xl shadow-indigo-500/20 mb-8 backdrop-blur-xl"
          >
            <img src="/logo.png" alt="Gyandeep" className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]" />
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6"
          >
            <span className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 bg-clip-text text-transparent drop-shadow-lg">
              Gyandeep
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="text-xl md:text-2xl text-gray-800 max-w-2xl mx-auto mb-3 font-semibold"
          >
            AI-Powered Smart Classroom System
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="text-gray-700 max-w-lg mx-auto mb-10 text-base"
          >
            Transform your classroom with face recognition, AI quizzes, real-time attendance, and gamified learning.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              onClick={onGetStarted}
              className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white font-bold py-4 px-10 rounded-2xl text-lg shadow-xl shadow-indigo-500/25 transition-all duration-300"
            >
              <span className="relative z-10">Get Started</span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600"
                initial={{ x: '100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-gray-800 font-semibold py-4 px-8 rounded-2xl text-lg border border-gray-300 bg-white/80 hover:bg-white hover:border-gray-400 backdrop-blur transition-all duration-300"
            >
              Learn More
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-6 h-10 rounded-full border-2 border-gray-500 flex items-start justify-center p-1.5"
          >
            <div className="w-1.5 h-2.5 rounded-full bg-gray-600" />
          </motion.div>
        </motion.div>
      </div>

      {/* Stats Section */}
      <div className="py-16 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCounter value="AI+" label="Powered Learning" delay={0} />
          <StatCounter value="100%" label="Attendance Accuracy" delay={0.1} />
          <StatCounter value="5x" label="Student Engagement" delay={0.2} />
          <StatCounter value="24/7" label="AI Assistant" delay={0.3} />
        </div>
      </div>

      {/* Scrollytelling Scenes */}
      <div className="py-16 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-4">
            How It Works
          </h2>
          <p className="text-gray-700 text-lg max-w-2xl mx-auto">
            From uploading notes to tracking progress, Gyandeep handles everything.
          </p>
        </motion.div>
        <div className="space-y-24">
          {scenes.map((scene, i) => (
            <ScrollScene key={scene.title} scene={scene} index={i} />
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="px-4 py-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-4">
            What makes Gyandeep special?
          </h2>
          <p className="text-gray-700 text-lg max-w-2xl mx-auto">
            A complete platform for the modern classroom
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-50/50 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-4">
            Ready to transform your classroom?
          </h2>
          <p className="text-gray-700 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of educators using AI to create engaging learning experiences.
          </p>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onGetStarted}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-12 rounded-2xl text-lg shadow-xl shadow-indigo-500/25"
          >
            Start Now — It's Free
          </motion.button>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-600 border-t border-gray-200">
        <p>Gyandeep — Built with React, Gemini AI & Three.js</p>
      </footer>
    </div>
  );
};

export default LandingPage;
