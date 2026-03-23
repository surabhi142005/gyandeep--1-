import React from 'react';
import { useRealtime } from '../../services/RealtimeProvider';
import { cn } from '../../components/AuditLog/utils';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  variant?: 'dot' | 'banner' | 'badge' | 'full';
  showRetry?: boolean;
  className?: string;
}

export function ConnectionStatus({ variant = 'dot', showRetry = true, className }: ConnectionStatusProps) {
  const { status, reconnectAttempts, retry } = useRealtime();

  const statusConfig = {
    connecting: {
      color: 'bg-yellow-500',
      text: 'Connecting...',
      icon: <RefreshCw className="w-4 h-4 animate-spin" />,
    },
    connected: {
      color: 'bg-green-500',
      text: 'Connected',
      icon: <Wifi className="w-4 h-4" />,
    },
    disconnected: {
      color: 'bg-gray-400',
      text: 'Offline',
      icon: <WifiOff className="w-4 h-4" />,
    },
    error: {
      color: 'bg-red-500',
      text: 'Connection Error',
      icon: <AlertCircle className="w-4 h-4" />,
    },
  };

  const config = statusConfig[status];

  if (variant === 'dot') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5',
          config.color,
          'w-2 h-2 rounded-full',
          status === 'connecting' && 'animate-pulse',
          className
        )}
        title={config.text}
      />
    );
  }

  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          status === 'connected' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          status === 'disconnected' && 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          status === 'connecting' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          status === 'error' && 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          className
        )}
      >
        {config.icon}
        <span>{config.text}</span>
      </div>
    );
  }

  if (variant === 'banner') {
    if (status === 'connected') return null;

    return (
      <div
        className={cn(
          'fixed bottom-4 right-4 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg z-50',
          status === 'disconnected' && 'bg-gray-800 text-white',
          status === 'connecting' && 'bg-yellow-600 text-white',
          status === 'error' && 'bg-red-600 text-white',
          className
        )}
      >
        {config.icon}
        <div>
          <p className="font-medium">{config.text}</p>
          {reconnectAttempts > 0 && (
            <p className="text-xs opacity-75">Attempt {reconnectAttempts}...</p>
          )}
        </div>
        {showRetry && (status === 'disconnected' || status === 'error') && (
          <button
            onClick={retry}
            className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div
          className={cn(
            'w-3 h-3 rounded-full',
            config.color,
            status === 'connecting' && 'animate-pulse'
          )}
        />
        {config.icon}
        <span className="text-sm font-medium">{config.text}</span>
        {reconnectAttempts > 0 && (
          <span className="text-xs text-gray-500">(Attempt {reconnectAttempts})</span>
        )}
        {showRetry && (status === 'disconnected' || status === 'error') && (
          <button
            onClick={retry}
            className="ml-2 flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Reconnect
          </button>
        )}
      </div>
    );
  }

  return null;
}

export default ConnectionStatus;
