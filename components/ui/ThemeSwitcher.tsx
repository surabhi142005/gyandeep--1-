import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check } from 'lucide-react';

const THEMES = [
  {
    id: 'cosmic-purple',
    name: 'Cosmic Purple',
    primary: '#6C63FF',
    secondary: '#FF6584',
    gradient: 'linear-gradient(135deg, #6C63FF, #FF6584)'
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    primary: '#0EA5E9',
    secondary: '#06B6D4',
    gradient: 'linear-gradient(135deg, #0EA5E9, #06B6D4)'
  },
  {
    id: 'forest-gold',
    name: 'Forest & Gold',
    primary: '#059669',
    secondary: '#F59E0B',
    gradient: 'linear-gradient(135deg, #059669, #F59E0B)'
  },
  {
    id: 'midnight-ember',
    name: 'Midnight Ember',
    primary: '#F97316',
    secondary: '#FACC15',
    gradient: 'linear-gradient(135deg, #F97316, #FACC15)'
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    primary: '#EC4899',
    secondary: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #EC4899, #8B5CF6)'
  },
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
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="bg-[var(--color-surface)] p-5 rounded-2xl shadow-2xl border border-[var(--color-border)]"
            style={{
              boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--gradient)' }}
              >
                <Palette className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Choose Theme
              </p>
            </div>
            <div className="flex gap-4">
              {THEMES.map((theme) => (
                <div key={theme.id} className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => {
                      onThemeChange(theme.id);
                      setIsOpen(false);
                    }}
                    className={`
                      relative w-10 h-10 rounded-full cursor-pointer
                      transition-all duration-200
                      hover:scale-110 active:scale-95
                      shadow-md
                      ${currentTheme === theme.id
                        ? 'ring-4 ring-white ring-offset-2 ring-offset-[var(--color-surface)] scale-110'
                        : 'hover:ring-4 hover:ring-white/30 hover:ring-offset-1 hover:ring-offset-[var(--color-surface)]'
                      }
                    `}
                    style={{ background: theme.gradient }}
                    title={theme.name}
                    aria-label={`Select ${theme.name} theme`}
                    aria-pressed={currentTheme === theme.id}
                  >
                    {currentTheme === theme.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Check className="w-5 h-5 text-white drop-shadow-lg" strokeWidth={3} />
                      </motion.div>
                    )}
                  </button>
                  <span className={`text-[10px] font-medium ${currentTheme === theme.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                    {theme.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-full shadow-xl
          flex items-center justify-center
          transition-all duration-300
          ${isOpen
            ? 'bg-theme-gradient border-transparent text-white shadow-lg'
            : 'bg-[var(--color-surface)] text-[var(--color-text)] border-2 border-[var(--color-border)]'
          }
        `}
        style={{
          ...(isOpen ? {} : {
            boxShadow: '0 8px 30px -8px var(--color-primary-shadow)'
          })
        }}
        aria-label={isOpen ? 'Close theme switcher' : 'Open theme switcher'}
        aria-expanded={isOpen}
      >
        <div 
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
            isOpen ? 'bg-white/20' : ''
          }`}
          style={isOpen ? {
            background: 'rgba(255, 255, 255, 0.2)'
          } : {
            background: 'var(--gradient)'
          }}
        >
          <Palette className={`w-5 h-5 ${isOpen ? 'text-white' : 'text-white'}`} />
        </div>
      </motion.button>
    </div>
  );
};

export default ThemeSwitcher;
