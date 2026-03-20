/**
 * components/ui/ToastQueue.tsx
 * Global toast notification queue component
 */

import React, { useEffect, useState } from 'react';
import { toastQueue, type Toast } from '../../services/toastService';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const toastStyles: Record<string, { bg: string; border: string; icon: React.ElementType }> = {
  success: { bg: 'bg-green-50 dark:bg-green-900/30', border: 'border-green-500', icon: CheckCircle },
  error: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-500', icon: XCircle },
  warning: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', border: 'border-yellow-500', icon: AlertTriangle },
  info: { bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-500', icon: Info },
};

const iconColors: Record<string, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const style = toastStyles[toast.type];
  const Icon = style.icon;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg
        ${style.bg} ${style.border}
        animate-slide-in-right
        transition-all duration-300 ease-out
        max-w-sm w-full
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[toast.type]}`} />
      <p className="flex-1 text-sm text-gray-700 dark:text-gray-200">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
};

const ToastQueue: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return toastQueue.subscribe(setToasts);
  }, []);

  const handleRemove = (id: string) => {
    toastQueue.remove(id);
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={handleRemove} />
      ))}
    </div>
  );
};

export default ToastQueue;
