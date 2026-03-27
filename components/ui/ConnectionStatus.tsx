/**
 * components/ui/ConnectionStatus.tsx
 * SSE/WebSocket connection status indicator
 */

import React from 'react';
import { Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { useConnectionStatus, type ConnectionStatus } from '../../hooks/useConnectionStatus';

interface ConnectionStatusIndicatorProps {
  showLabel?: boolean;
  showReconnectAttempts?: boolean;
  className?: string;
}

const statusConfig: Record<ConnectionStatus, {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
}> = {
  connected: {
    icon: Wifi,
    label: 'Connected',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
  },
  disconnected: {
    icon: WifiOff,
    label: 'Disconnected',
    color: 'text-red-500',
    bgColor: 'bg-red-500',
  },
  connecting: {
    icon: Loader2,
    label: 'Connecting',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
  },
  reconnecting: {
    icon: RefreshCw,
    label: 'Reconnecting',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
  },
};

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  showLabel = true,
  className = '',
}) => {
  const { status, isConnected, reconnectAttempts } = useConnectionStatus();
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Icon
          className={`w-4 h-4 ${config.color} ${status === 'connecting' || status === 'reconnecting' ? 'animate-spin' : ''}`}
        />
        {status === 'connected' && (
          <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 ${config.bgColor} rounded-full`} />
        )}
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
      {showReconnectAttempts && reconnectAttempts > 0 && (
        <span className="text-xs text-gray-500">
          ({reconnectAttempts} attempts)
        </span>
      )}
    </div>
  );
};

interface ConnectionStatusBadgeProps {
  className?: string;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({ className = '' }) => {
  const { status, isConnected, lastConnected } = useConnectionStatus();

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      <span className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
      }`} />
      <span className={isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
        {isConnected ? 'Live' : 'Offline'}
      </span>
      {isConnected && lastConnected && (
        <span className="text-gray-400">
          since {formatTime(lastConnected)}
        </span>
      )}
    </div>
  );
};

interface ConnectionStatusBarProps {
  className?: string;
  autoHide?: boolean;
  hideDelay?: number;
}

export const ConnectionStatusBar: React.FC<ConnectionStatusBarProps> = ({
  className = '',
  autoHide = true,
  hideDelay = 3000,
}) => {
  const { status, isConnected, reconnectAttempts } = useConnectionStatus();
  const config = statusConfig[status];
  const Icon = config.icon;

  if (autoHide && isConnected) {
    return null;
  }

  return (
    <div
      className={`
        flex items-center justify-center gap-2 px-4 py-2 rounded-lg
        ${status === 'connected' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      <Icon
        className={`w-5 h-5 ${config.color} ${status === 'connecting' || status === 'reconnecting' ? 'animate-spin' : ''}`}
      />
      <span className={`text-sm font-medium ${config.color}`}>
        {status === 'connected' && 'Real-time updates active'}
        {status === 'disconnected' && 'Real-time updates disabled'}
        {status === 'connecting' && 'Connecting to server...'}
        {status === 'reconnecting' && `Reconnecting... (attempt ${reconnectAttempts})`}
      </span>
    </div>
  );
};

export default ConnectionStatusIndicator;
