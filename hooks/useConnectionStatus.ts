/**
 * hooks/useConnectionStatus.ts
 * React hook for SSE/WebSocket connection status
 */

import { useState, useEffect, useCallback } from 'react';
import { websocketService } from '../services/websocketService';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting';

interface UseConnectionStatusReturn {
  status: ConnectionStatus;
  isConnected: boolean;
  lastConnected: Date | null;
  reconnectAttempts: number;
}

export function useConnectionStatus(): UseConnectionStatusReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const handleConnect = () => {
      setStatus('connected');
      setLastConnected(new Date());
      setReconnectAttempts(0);
    };

    const handleDisconnect = () => {
      setStatus('disconnected');
    };

    const handleReconnecting = () => {
      setStatus('reconnecting');
      setReconnectAttempts(prev => prev + 1);
    };

    if (websocketService.isConnected()) {
      setStatus('connected');
      setLastConnected(new Date());
    }

    const unsubConnect = websocketService.on('connected', handleConnect);
    const unsubHeartbeat = websocketService.on('heartbeat', handleConnect);

    return () => {
      unsubConnect();
      unsubHeartbeat();
    };
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    lastConnected,
    reconnectAttempts,
  };
}

export function useConnectionStatusWithPolling(intervalMs: number = 5000): UseConnectionStatusReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const checkConnection = () => {
      const isConnected = websocketService.isConnected();
      setStatus(prev => {
        if (isConnected && prev !== 'connected') {
          setLastConnected(new Date());
          setReconnectAttempts(0);
          return 'connected';
        } else if (!isConnected && prev === 'connected') {
          return 'disconnected';
        }
        return prev;
      });
    };

    checkConnection();
    const interval = setInterval(checkConnection, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return {
    status,
    isConnected: status === 'connected',
    lastConnected,
    reconnectAttempts,
  };
}
