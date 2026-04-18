import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { realtimeClient } from '../services/realtimeClient';

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoHide?: boolean;
  autoHideDelay?: number;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

const STATUS_CONFIG: Record<ConnectionState, { 
  icon: React.ReactNode; 
  label: string; 
  color: string; 
  bgColor: string;
  borderColor: string;
}> = {
  connecting: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: 'Connecting...',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  connected: {
    icon: <Wifi className="w-4 h-4" />,
    label: 'Live',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  disconnected: {
    icon: <WifiOff className="w-4 h-4" />,
    label: 'Offline',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    label: 'Reconnecting...',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
};

const POSITION_CLASSES = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className = '',
  showLabel = true,
  position = 'top-right',
  autoHide = false,
  autoHideDelay = 3000,
}) => {
  const [status, setStatus] = useState<ConnectionState>('disconnected');
  const [isVisible, setIsVisible] = useState(true);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    const unsubscribe = realtimeClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setIsVisible(true);
      
      if (autoHide && newStatus === 'connected') {
        setTimeout(() => setIsVisible(false), autoHideDelay);
      }
    });

    const unsubscribeConnect = realtimeClient.onConnect(() => {
      setStatus('connected');
      setReconnectAttempt(0);
    });

    const unsubscribeDisconnect = realtimeClient.onDisconnect(() => {
      setStatus('disconnected');
    });

    setStatus(realtimeClient.status);

    return () => {
      unsubscribe();
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, [autoHide, autoHideDelay]);

  const config = STATUS_CONFIG[status];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`fixed ${POSITION_CLASSES[position]} z-50 ${className}`}
        >
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border ${config.bgColor} ${config.borderColor}`}
          >
            <span className={config.color}>{config.icon}</span>
            {showLabel && (
              <>
                <span className={`text-sm font-medium ${config.color}`}>
                  {config.label}
                </span>
                {status === 'connecting' && reconnectAttempt > 0 && (
                  <span className="text-xs text-amber-600">
                    (attempt {reconnectAttempt})
                  </span>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ConnectionBannerProps {
  onRetry?: () => void;
  className?: string;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ onRetry, className = '' }) => {
  const [status, setStatus] = useState<ConnectionState>(realtimeClient.status);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = realtimeClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
      if (newStatus !== 'connected') {
        setIsVisible(true);
      } else {
        setTimeout(() => setIsVisible(false), 2000);
      }
    });

    setStatus(realtimeClient.status);

    return unsubscribe;
  }, []);

  if (!isVisible || status === 'connected') return null;

  const config = STATUS_CONFIG[status];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`w-full overflow-hidden ${className}`}
      >
        <div className={`${config.bgColor} ${config.borderColor} border-y px-4 py-2`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={config.color}>{config.icon}</span>
              <span className={`text-sm font-medium ${config.color}`}>
                {status === 'connecting' && 'Reconnecting to server...'}
                {status === 'disconnected' && 'Connection interrupted. Attempting to reconnect...'}
                {status === 'error' && 'Connection error. Retrying...'}
              </span>
            </div>
            {(status === 'disconnected' || status === 'error') && onRetry && (
              <button
                onClick={onRetry}
                className={`text-sm font-semibold ${config.color} hover:underline`}
              >
                Retry Now
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const ConnectionDot: React.FC<{ size?: 'sm' | 'md' | 'lg'; showPulse?: boolean }> = ({ 
  size = 'md', 
  showPulse = true 
}) => {
  const [status, setStatus] = useState<ConnectionState>(realtimeClient.status);

  useEffect(() => {
    const unsubscribe = realtimeClient.onStatusChange(setStatus);
    setStatus(realtimeClient.status);
    return unsubscribe;
  }, []);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const colorClasses = {
    connecting: 'bg-amber-500',
    connected: 'bg-emerald-500',
    disconnected: 'bg-gray-400',
    error: 'bg-red-500',
  };

  return (
    <div className={`relative inline-flex ${sizeClasses[size]}`}>
      <div className={`${sizeClasses[size]} rounded-full ${colorClasses[status]}`} />
      {showPulse && status === 'connected' && (
        <motion.div
          className={`absolute inset-0 rounded-full bg-emerald-500`}
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
};

export default ConnectionStatus;
