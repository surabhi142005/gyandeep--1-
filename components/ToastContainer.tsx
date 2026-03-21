import React, { useEffect, useState, useCallback } from 'react';
import { toastQueue, type Toast } from '../services/toastService';
import ToastNotification from './ToastNotification';

/**
 * ToastContainer
 *
 * Root component that manages and displays toast notifications.
 * Place this component at the root of your app (e.g., in App.tsx).
 *
 * Usage:
 *   import { ToastContainer } from './components/ToastContainer';
 *
 *   function App() {
 *     return (
 *       <>
 *         <ToastContainer />
 *         <YourApp />
 *       </>
 *     );
 *   }
 */

interface ToastContainerProps {
  /** Maximum number of toasts to show at once (default: 5) */
  maxToasts?: number;
  /** Position of toasts (default: top-right) */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

const positionStyles: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  maxToasts = 5,
  position = 'top-right',
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastQueue.setMaxToasts(maxToasts);
    const unsubscribe = toastQueue.subscribe(setToasts);
    return () => unsubscribe();
  }, [maxToasts]);

  const handleClose = useCallback((id: string) => {
    toastQueue.remove(id);
  }, []);

  if (toasts.length === 0) return null;

  const positionClass = positionStyles[position];

  return (
    <div
      className={`fixed z-[100] flex flex-col gap-2 ${positionClass}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => handleClose(toast.id)}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
