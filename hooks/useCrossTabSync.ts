/**
 * hooks/useCrossTabSync.ts
 * Synchronizes state across browser tabs using BroadcastChannel
 */

import { useState, useEffect, useCallback } from 'react';

type SyncMessage =
  | { type: 'SESSION_CREATED'; data: any }
  | { type: 'SESSION_ENDED'; sessionId: string }
  | { type: 'ATTENDANCE_MARKED'; data: any }
  | { type: 'QUIZ_SUBMITTED'; data: any }
  | { type: 'XP_UPDATED'; data: any }
  | { type: 'REFRESH_DATA'; source: string }
  | { type: 'LOGOUT' }
  | { type: 'CUSTOM'; event: string; data: any };

interface UseCrossTabSyncOptions {
  onSessionCreated?: (data: any) => void;
  onSessionEnded?: (sessionId: string) => void;
  onAttendanceMarked?: (data: any) => void;
  onQuizSubmitted?: (data: any) => void;
  onXpUpdated?: (data: any) => void;
  onRefreshData?: (source: string) => void;
  onLogout?: () => void;
  onCustomEvent?: (event: string, data: any) => void;
}

const CHANNEL_NAME = 'gyandeep_sync';

export function useCrossTabSync(options: UseCrossTabSyncOptions = {}) {
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if BroadcastChannel is supported
    if (!('BroadcastChannel' in window)) {
      setIsSupported(false);
      console.warn('BroadcastChannel not supported in this browser');
      return;
    }

    const ch = new BroadcastChannel(CHANNEL_NAME);
    setChannel(ch);

    const handleMessage = (event: MessageEvent<SyncMessage>) => {
      const { data } = event;

      switch (data.type) {
        case 'SESSION_CREATED':
          options.onSessionCreated?.(data.data);
          break;
        case 'SESSION_ENDED':
          options.onSessionEnded?.(data.sessionId);
          break;
        case 'ATTENDANCE_MARKED':
          options.onAttendanceMarked?.(data.data);
          break;
        case 'QUIZ_SUBMITTED':
          options.onQuizSubmitted?.(data.data);
          break;
        case 'XP_UPDATED':
          options.onXpUpdated?.(data.data);
          break;
        case 'REFRESH_DATA':
          options.onRefreshData?.(data.source);
          break;
        case 'LOGOUT':
          options.onLogout?.();
          break;
        case 'CUSTOM':
          options.onCustomEvent?.(data.event, data.data);
          break;
      }
    };

    ch.addEventListener('message', handleMessage);

    return () => {
      ch.removeEventListener('message', handleMessage);
      ch.close();
    };
  }, [
    options.onSessionCreated,
    options.onSessionEnded,
    options.onAttendanceMarked,
    options.onQuizSubmitted,
    options.onXpUpdated,
    options.onRefreshData,
    options.onLogout,
    options.onCustomEvent,
  ]);

  const broadcast = useCallback(<T extends SyncMessage>(message: T) => {
    if (channel) {
      channel.postMessage(message);
    }
  },
  [channel]
  );

  const notifySessionCreated = useCallback(
    (data: any) => broadcast({ type: 'SESSION_CREATED', data }),
    [broadcast]
  );

  const notifySessionEnded = useCallback(
    (sessionId: string) => broadcast({ type: 'SESSION_ENDED', sessionId }),
    [broadcast]
  );

  const notifyAttendanceMarked = useCallback(
    (data: any) => broadcast({ type: 'ATTENDANCE_MARKED', data }),
    [broadcast]
  );

  const notifyQuizSubmitted = useCallback(
    (data: any) => broadcast({ type: 'QUIZ_SUBMITTED', data }),
    [broadcast]
  );

  const notifyXpUpdated = useCallback(
    (data: any) => broadcast({ type: 'XP_UPDATED', data }),
    [broadcast]
  );

  const requestRefresh = useCallback(
    (source: string) => broadcast({ type: 'REFRESH_DATA', source }),
    [broadcast]
  );

  const notifyLogout = useCallback(
    () => broadcast({ type: 'LOGOUT' }),
    [broadcast]
  );

  const broadcastCustom = useCallback(
    (event: string, data: any) => broadcast({ type: 'CUSTOM', event, data }),
    [broadcast]
  );

  return {
    isSupported,
    broadcast,
    notifySessionCreated,
    notifySessionEnded,
    notifyAttendanceMarked,
    notifyQuizSubmitted,
    notifyXpUpdated,
    requestRefresh,
    notifyLogout,
    broadcastCustom,
  };
}
