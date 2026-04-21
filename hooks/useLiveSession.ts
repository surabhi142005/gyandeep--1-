/**
 * hooks/useLiveSession.ts
 * Manages live session with server-synced countdown timer and persistence
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeClient } from '../services/realtimeClient';

interface SessionState {
  id: string | null;
  code: string | null;
  expiry: number | null;
  isActive: boolean;
  subject: string | null;
  teacherId: string | null;
}

interface UseLiveSessionOptions {
  teacherId?: string;
  sessionId?: string;
}

export function useLiveSession({ teacherId, sessionId }: UseLiveSessionOptions = {}) {
  const [session, setSession] = useState<SessionState>(() => {
    // Restore from sessionStorage on init
    const saved = sessionStorage.getItem('gyandeep_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only restore if not expired
        if (parsed.expiry && parsed.expiry > Date.now()) {
          return parsed;
        }
      } catch (e) { console.warn('Failed to restore session from storage:', e); }
    }
    return {
      id: null,
      code: null,
      expiry: null,
      isActive: false,
      subject: null,
      teacherId: null,
    };
  });

  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isWarning, setIsWarning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Persist session to sessionStorage
  const persistSession = useCallback((newSession: SessionState) => {
    if (newSession.id) {
      sessionStorage.setItem('gyandeep_session', JSON.stringify(newSession));
    } else {
      sessionStorage.removeItem('gyandeep_session');
    }
  }, []);

  // Sync with server to get accurate expiry
  const syncWithServer = useCallback(async () => {
    if (!session.id) return;

    try {
      const response = await fetch(`/api/sessions/${session.id}`);
      if (response.ok) {
        const serverSession = await response.json();
        if (serverSession.expiry) {
          const serverExpiry = new Date(serverSession.expiry).getTime();
          // Update if server time differs significantly (>5 seconds)
          if (Math.abs(serverExpiry - (session.expiry || 0)) > 5000) {
            setSession(prev => {
              const updated = { ...prev, expiry: serverExpiry };
              persistSession(updated);
              return updated;
            });
          }
        }
        // Check if session ended on server
        if (serverSession.sessionStatus === 'ended') {
          setSession({
            id: null,
            code: null,
            expiry: null,
            isActive: false,
            subject: null,
            teacherId: null,
          });
          sessionStorage.removeItem('gyandeep_session');
        }
      }
    } catch (error) {
      console.warn('Failed to sync session with server:', error);
    }
  }, [session.id, session.expiry, persistSession]);

  // Countdown timer
  useEffect(() => {
    if (!session.expiry || !session.isActive) {
      setTimeRemaining(0);
      setIsWarning(false);
      setIsExpired(false);
      return;
    }

    const calculateTime = () => {
      const remaining = Math.max(0, session.expiry! - Date.now());
      setTimeRemaining(remaining);
      setIsWarning(remaining <= 120000 && remaining > 0); // Warning at 2 minutes
      setIsExpired(remaining <= 0);

      if (remaining <= 0) {
        // Session expired - update state
        setSession(prev => ({ ...prev, isActive: false, code: null }));
        sessionStorage.removeItem('gyandeep_session');
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [session.expiry, session.isActive]);

  // Periodic server sync (every 30 seconds)
  useEffect(() => {
    if (!session.id) return;

    syncWithServer();
    syncIntervalRef.current = setInterval(syncWithServer, 30000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [session.id, syncWithServer]);

  // Listen for session updates from server
  useEffect(() => {
    if (!sessionId && !teacherId) return;

    const room = sessionId ? `session-${sessionId}` : `teacher-${teacherId}`;
    realtimeClient.joinRoom(room);

    const unsub = realtimeClient.on('session-update', (data) => {
      if (data.type === 'ended') {
        setSession({
          id: null,
          code: null,
          expiry: null,
          isActive: false,
          subject: null,
          teacherId: null,
        });
        sessionStorage.removeItem('gyandeep_session');
      }
    });

    return () => {
      unsub();
      realtimeClient.leaveRoom(room);
    };
  }, [sessionId, teacherId]);

  const createSession = useCallback(async (subject: string, durationMinutes: number = 10) => {
    if (!teacherId) throw new Error('Teacher ID required');

    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId,
        subjectId: subject,
        code: Math.floor(100000 + Math.random() * 900000).toString(),
      }),
    });

    if (!response.ok) throw new Error('Failed to create session');

    const { session: newSession } = await response.json();
    const sessionState: SessionState = {
      id: newSession.id,
      code: newSession.code,
      expiry: new Date(newSession.expiry).getTime(),
      isActive: true,
      subject,
      teacherId,
    };

    setSession(sessionState);
    persistSession(sessionState);

    return sessionState;
  }, [teacherId, persistSession]);

  const endSession = useCallback(async () => {
    if (!session.id) return;

    try {
      await fetch(`/api/sessions/${session.id}/end`, { method: 'PATCH' });
    } catch (error) {
      console.warn('Failed to end session on server:', error);
    }

    setSession({
      id: null,
      code: null,
      expiry: null,
      isActive: false,
      subject: null,
      teacherId: null,
    });
    sessionStorage.removeItem('gyandeep_session');
  }, [session.id]);

  const regenerateCode = useCallback(async () => {
    if (!session.id || !session.subject) throw new Error('No active session');

    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId,
        subjectId: session.subject,
        code: Math.floor(100000 + Math.random() * 900000).toString(),
      }),
    });

    if (!response.ok) throw new Error('Failed to regenerate code');

    const { session: newSession } = await response.json();
    const updated: SessionState = {
      ...session,
      id: newSession.id,
      code: newSession.code,
      expiry: new Date(newSession.expiry).getTime(),
    };

    setSession(updated);
    persistSession(updated);

    return updated;
  }, [session, teacherId, persistSession]);

  const formatTimeRemaining = useCallback(() => {
    if (timeRemaining <= 0) return '00:00';
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  return {
    session,
    timeRemaining,
    formattedTime: formatTimeRemaining(),
    isWarning,
    isExpired,
    createSession,
    endSession,
    regenerateCode,
  };
}
