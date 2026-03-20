import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check } from 'lucide-react';

const THEMES = [
  { id: 'cosmic-purple', name: 'Cosmic Purple', gradient: 'linear-gradient(135deg, #6C63FF, #FF6584)' },
  { id: 'ocean-breeze', name: 'Ocean Breeze', gradient: 'linear-gradient(135deg, #0EA5E9, #06B6D4)' },
  { id: 'forest-gold', name: 'Forest & Gold', gradient: 'linear-gradient(135deg, #059669, #F59E0B)' },
  { id: 'midnight-ember', name: 'Midnight Ember', gradient: 'linear-gradient(135deg, #F97316, #FACC15)' },
  { id: 'rose-quartz', name: 'Rose Quartz', gradient: 'linear-gradient(135deg, #EC4899, #8B5CF6)' },
];

interface ThemeSwitcherProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, onThemeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex gap-3"
          >
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  onThemeChange(theme.id);
                  setIsOpen(false);
                }}
                className={`relative w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm border-2 ${currentTheme === theme.id ? 'border-white ring-2 ring-primary ring-offset-2' : 'border-transparent'}`}
                style={{ background: theme.gradient }}
                title={theme.name}
              >
                {currentTheme === theme.id && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Switch Theme"
      >
        <Palette className="w-6 h-6" />
      </motion.button>
    </div>
  );
};

export default ThemeSwitcher;
