import React, { useState } from 'react';
import { t } from '../services/i18n';

interface AccessibilityPanelProps {
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  fontScale: number;
  setFontScale: (v: number) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  screenReaderHints: boolean;
  setScreenReaderHints: (v: boolean) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  darkMode?: boolean;
  setDarkMode?: (v: boolean) => void;
  theme: string;
}

const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  highContrast, setHighContrast,
  fontScale, setFontScale,
  reducedMotion, setReducedMotion,
  screenReaderHints, setScreenReaderHints,
  voiceEnabled, setVoiceEnabled,
  darkMode, setDarkMode,
  theme,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const themeColor = theme === 'teal' ? 'bg-teal-600' : theme === 'crimson' ? 'bg-red-600' : theme === 'purple' ? 'bg-purple-600' : 'bg-indigo-600';

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 left-6 z-50 ${themeColor} text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform`}
        aria-label={t('Accessibility Settings')}
        title={t('Accessibility Settings')}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-label={t('Accessibility Settings')}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">{t('Accessibility Settings')}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label={t('Close accessibility panel')}
              >
                &times;
              </button>
            </div>

            <div className="space-y-5">
              {/* Dark Mode */}
              {setDarkMode && (
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-gray-700">{t('Dark Mode')}</label>
                    <p className="text-xs text-gray-500">{t('Switch to a dark color scheme')}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={!!darkMode}
                    onClick={() => setDarkMode(!darkMode)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? themeColor : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              )}

              {/* High Contrast */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-gray-700">{t('High Contrast')}</label>
                  <p className="text-xs text-gray-500">{t('Increase color contrast for better visibility')}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={highContrast}
                  onClick={() => setHighContrast(!highContrast)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${highContrast ? themeColor : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${highContrast ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              {/* Reduced Motion */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-gray-700">{t('Reduced Motion')}</label>
                  <p className="text-xs text-gray-500">{t('Disable animations and transitions')}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={reducedMotion}
                  onClick={() => setReducedMotion(!reducedMotion)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${reducedMotion ? themeColor : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${reducedMotion ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              {/* Font Scale */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-gray-700">{t('Font Size')}</label>
                  <span className="text-sm text-gray-500">{Math.round(fontScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.6}
                  step={0.05}
                  value={fontScale}
                  onChange={(e) => setFontScale(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                  aria-label={t('Adjust font size')}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{t('Small')}</span>
                  <span>{t('Default')}</span>
                  <span>{t('Large')}</span>
                </div>
              </div>

              {/* Screen Reader Hints */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-gray-700">{t('Screen Reader Hints')}</label>
                  <p className="text-xs text-gray-500">{t('Add extra descriptions for assistive technology')}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={screenReaderHints}
                  onClick={() => setScreenReaderHints(!screenReaderHints)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${screenReaderHints ? themeColor : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${screenReaderHints ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              {/* Voice Assistance */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-gray-700">{t('Voice Assistance')}</label>
                  <p className="text-xs text-gray-500">{t('Enable text-to-speech for AI responses')}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={voiceEnabled}
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${voiceEnabled ? themeColor : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${voiceEnabled ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">{t('Keyboard Shortcuts')}</h3>
              <div className="text-xs text-gray-500 space-y-1">
                <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border text-gray-700">Tab</kbd> {t('Navigate between elements')}</p>
                <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border text-gray-700">Esc</kbd> {t('Close modals and panels')}</p>
                <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border text-gray-700">Enter</kbd> {t('Activate buttons and links')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AccessibilityPanel;
