import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnyUser } from '../types';
import { NotificationCenter } from './realtime/NotificationCenter';

interface HeaderProps {
  user: AnyUser | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onShowProfile: () => void;
  onLogout: () => void;
  theme: string;
  onThemeChange?: (theme: string) => void;
  locale?: string;
  onLocaleChange?: (locale: string) => void;
  notifications?: number;
}

const THEMES = [
  { id: 'cosmic-purple', label: 'Cosmic', color: 'bg-[#6C63FF]' },
  { id: 'ocean-breeze', label: 'Ocean', color: 'bg-[#0EA5E9]' },
  { id: 'forest-gold', label: 'Forest', color: 'bg-[#059669]' },
  { id: 'midnight-ember', label: 'Midnight', color: 'bg-[#F97316]' },
  { id: 'rose-quartz', label: 'Rose', color: 'bg-[#EC4899]' },
] as const

const LOCALES = [
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { id: 'mr', label: 'मराठी', flag: '🇮🇳' },
] as const

const Header: React.FC<HeaderProps> = ({
  user,
  darkMode,
  onToggleDarkMode,
  onShowProfile,
  onLogout,
  theme,
  onThemeChange,
  locale = 'en',
  onLocaleChange,
  notifications = 0,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut "/" for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !searchOpen && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as Element)?.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setUserMenuOpen(false);
        setMobileOpen(false);
        setSettingsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Focus search on open
  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  return (
    <>
      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 w-full safe-area-top"
      >
        <div className="mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl mt-2 px-4 shadow-lg shadow-black/5 border border-white/20">
            {/* Left: Logo + nav */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Gyandeep" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
                  Gyandeep
                </span>
              </div>
              <div className="hidden md:flex items-center gap-1 ml-4">
                <span className="px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg">
                  {user.role === 'teacher' ? 'Teacher' : user.role === 'admin' ? 'Admin' : 'Student'}
                </span>
              </div>
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-md mx-4 hidden sm:block">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-400 bg-gray-100/80 hover:bg-gray-200/80 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search...</span>
                <kbd className="ml-auto px-2 py-0.5 text-[10px] text-gray-400 bg-gray-200 rounded font-mono">/</kbd>
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Search on mobile */}
              <button
                onClick={() => setSearchOpen(true)}
                className="sm:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Notification bell */}
              <NotificationCenter className="notification-center" />

              {/* Settings (theme + locale) */}
              <div ref={settingsRef} className="relative">
                <button
                  onClick={() => { setSettingsOpen(!settingsOpen); setUserMenuOpen(false); }}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  title="Theme & Language"
                  aria-label="Open settings"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                <AnimatePresence>
                  {settingsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100 py-3 overflow-hidden z-50"
                    >
                      {/* Theme selector */}
                      {onThemeChange && (
                        <div className="px-4 pb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Theme</p>
                          <div className="grid grid-cols-4 gap-2">
                            {THEMES.map(t => (
                              <button
                                key={t.id}
                                onClick={() => onThemeChange(t.id)}
                                title={t.label}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${theme === t.id ? 'bg-gray-100 ring-2 ring-indigo-400' : 'hover:bg-gray-50'}`}
                              >
                                <span className={`w-5 h-5 rounded-full ${t.color}`} />
                                <span className="text-[10px] text-gray-600">{t.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Locale selector */}
                      {onLocaleChange && (
                        <>
                          <div className="border-t border-gray-100 mx-4 my-1" />
                          <div className="px-4 pt-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Language</p>
                            <div className="space-y-1">
                              {LOCALES.map(l => (
                                <button
                                  key={l.id}
                                  onClick={() => { onLocaleChange(l.id); setSettingsOpen(false); }}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${locale === l.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                >
                                  <span>{l.flag}</span>
                                  <span>{l.label}</span>
                                  {locale === l.id && (
                                    <svg className="w-4 h-4 ml-auto text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Dark mode toggle */}
              <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                title={darkMode ? 'Light mode' : 'Dark mode'}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {/* User menu */}
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {user.faceImage ? (
                    <img src={user.faceImage} alt="Profile" className="w-8 h-8 rounded-xl object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {user.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 hidden md:block max-w-[100px] truncate">
                    {user.name}
                  </span>
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100 py-2 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email || 'No email'}</p>
                      </div>
                      <button
                        onClick={() => { onShowProfile(); setUserMenuOpen(false); }}
                        className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </button>
                      <button
                        onClick={() => { onLogout(); setUserMenuOpen(false); }}
                        className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="relative w-full max-w-lg mx-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search students, subjects, notes..."
                  className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
                />
                <kbd className="px-2 py-1 text-[10px] text-gray-400 bg-gray-100 rounded font-mono">ESC</kbd>
              </div>
              <div className="p-4 text-center text-sm text-gray-400">
                {searchQuery ? `No results for "${searchQuery}"` : 'Start typing to search...'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-72 z-50 bg-white/95 backdrop-blur-xl shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="font-bold text-lg">Menu</span>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  {user.faceImage ? (
                    <img src={user.faceImage} alt="" className="w-10 h-10 rounded-xl object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {user.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => { onShowProfile(); setMobileOpen(false); }}
                  className="w-full p-3 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-xl flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>
                <button
                  onClick={onToggleDarkMode}
                  className="w-full p-3 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-xl flex items-center gap-3"
                >
                  {darkMode ? '☀️' : '🌙'}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>

                {/* Theme swatches in mobile drawer */}
                {onThemeChange && (
                  <div className="px-3 py-2">
                    <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Theme</p>
                    <div className="flex gap-2">
                      {THEMES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => onThemeChange(t.id)}
                          title={t.label}
                          className={`w-7 h-7 rounded-full ${t.color} transition-transform ${theme === t.id ? 'ring-2 ring-offset-2 ring-indigo-400 scale-110' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Locale in mobile drawer */}
                {onLocaleChange && (
                  <div className="px-3 py-2">
                    <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Language</p>
                    <div className="flex gap-2 flex-wrap">
                      {LOCALES.map(l => (
                        <button
                          key={l.id}
                          onClick={() => onLocaleChange(l.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${locale === l.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          {l.flag} {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <hr className="my-2 border-gray-100" />
                <button
                  onClick={() => { onLogout(); setMobileOpen(false); }}
                  className="w-full p-3 text-sm text-left text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-3"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
