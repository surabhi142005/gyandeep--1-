import React, { useEffect, useState, useCallback, useMemo } from 'react';

/* ─── Toast Type ─────────────────────────────────────────────────────────── */

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastNotificationProps {
  message: string;
  type: ToastType;
  /** Auto-close delay in ms (default: 5000). Set to 0 to disable. */
  duration?: number;
  onClose: () => void;
}

/* ─── Toast Icons (accessible SVGs) ──────────────────────────────────────── */

const icons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

/* ─── Theme Styles (WCAG AA contrast) ────────────────────────────────────── */

const themeStyles: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-gray-900',
  info: 'bg-blue-600 text-white',
};

const progressColors: Record<ToastType, string> = {
  success: 'bg-emerald-300',
  error: 'bg-red-300',
  warning: 'bg-amber-300',
  info: 'bg-blue-300',
};

/* ─── Component ──────────────────────────────────────────────────────────── */

const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  type,
  duration = 5000,
  onClose,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(onClose, 200); // match exit animation duration
  }, [onClose]);

  // Auto-close timer with progress bar
  useEffect(() => {
    if (duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        handleClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, handleClose]);

  // Keyboard: Escape to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const animationClass = isExiting ? 'gd-toast-exit' : 'gd-toast-enter';
  const style = useMemo(() => themeStyles[type], [type]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`fixed top-4 right-4 z-[100] max-w-sm w-full rounded-xl overflow-hidden ${style} ${animationClass}`}
      style={{ boxShadow: 'var(--shadow-toast, 0 20px 60px -12px rgba(0,0,0,0.25))' }}
    >
      <div className="flex items-center gap-3 p-4">
        {icons[type]}
        <span className="flex-grow text-sm font-medium leading-snug">{message}</span>
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-full opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Dismiss notification"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-1 w-full bg-black/10">
          <div
            className={`h-full transition-none ${progressColors[type]}`}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Time remaining before notification closes"
          />
        </div>
      )}
    </div>
  );
};

export default ToastNotification;