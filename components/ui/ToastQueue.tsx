/**
 * components/ui/ToastQueue.tsx
 * Global toast notification queue component
 */

import React, { useEffect, useState } from 'react';
import { toastQueue, type Toast } from '../../services/toastService';
import { CheckCircle, XCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react';

const toastStyles: Record<string, { icon: React.ElementType; iconColor: string }> = {
  success: { icon: CheckCircle, iconColor: '#22C55E' },
  error: { icon: XCircle, iconColor: '#EF4444' },
  warning: { icon: AlertTriangle, iconColor: '#F59E0B' },
  info: { icon: Info, iconColor: 'var(--color-primary)' },
  loading: { icon: Loader2, iconColor: 'var(--color-primary)' },
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const style = toastStyles[toast.type] || toastStyles.info;
  const Icon = style.icon;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 p-4 rounded-xl shadow-lg animate-slide-in-right transition-all duration-300 ease-out max-w-sm w-full"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderLeft: '4px solid var(--color-primary)',
        color: 'var(--color-text)'
      }}
    >
      <Icon 
        className="w-5 h-5 flex-shrink-0 mt-0.5 animate-spin" 
        style={{ color: style.iconColor, animation: toast.type === 'loading' ? 'spin 1s linear infinite' : 'none' }} 
      />
      <p className="flex-1 text-sm">{toast.message}</p>
      {toast.type !== 'loading' && (
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 p-1 rounded transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
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
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={handleRemove} />
      ))}
    </div>
  );
};

export default ToastQueue;
