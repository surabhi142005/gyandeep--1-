/**
 * hooks/useSessionPersistence.ts
 * Handles session persistence across page refreshes
 */

import { useState, useEffect, useCallback } from 'react';
import { realtimeClient } from '../services/realtimeClient';

const SESSION_STORAGE_KEY = 'gyandeep_active_session';
const USER_ID_KEY = 'gyandeep_user_id';

interface ActiveSession {
  id: string;
  code: string;
  teacherId: string;
  classId?: string;
  subjectId: string;
  sessionStatus: 'waiting' | 'active' | 'ended';
  expiry: string;
  remainingTime: number;
  locationEnabled?: boolean;
  faceEnabled?: boolean;
  quizPublished?: boolean;
}

interface UseSessionPersistenceOptions {
  onSessionRestored?: (session: ActiveSession) => void;
  onSessionExpired?: () => void;
  onSessionEnded?: (sessionId: string) => void;
}

export function useSessionPersistence(options: UseSessionPersistenceOptions = {}) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Restore session from storage on mount
  const restoreSession = useCallback(async () => {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      setIsLoading(false);
      return null;
    }

    try {
      const parsed: ActiveSession = JSON.parse(stored);
      
      // Check if expired based on stored expiry
      if (new Date(parsed.expiry) < new Date()) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        options.onSessionExpired?.();
        setIsLoading(false);
        return null;
      }

      setActiveSession(parsed);
      
      // Calculate initial remaining time
      const remaining = new Date(parsed.expiry).getTime() - Date.now();
      setTimeRemaining(Math.max(0, remaining));

      // Fetch fresh data from server
      const response = await fetch(`/api/sessions/active?teacherId=${parsed.teacherId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.active && data.session) {
          setActiveSession(data.session);
          setTimeRemaining(data.session.remainingTime);
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data.session));
          options.onSessionRestored?.(data.session);
        } else {
          // Session no longer active
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setActiveSession(null);
          options.onSessionExpired?.();
        }
      }

      setIsLoading(false);
      return parsed;
    } catch (error) {
      console.error('Failed to restore session:', error);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      setIsLoading(false);
      return null;
    }
  }, [options]);

  // Save session to storage
  const saveSession = useCallback((session: ActiveSession) => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    setActiveSession(session);
    setTimeRemaining(session.remainingTime);
  }, []);

  // Clear session from storage
  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(USER_ID_KEY);
    setActiveSession(null);
    setTimeRemaining(null);
  }, []);

  // Store user ID for active session check
  const storeUserId = useCallback((userId: string) => {
    sessionStorage.setItem(USER_ID_KEY, userId);
  }, []);

  // WebSocket listener for session updates
  useEffect(() => {
    if (!activeSession) return;

    const room = `session-${activeSession.id}`;
    realtimeClient.joinRoom(room);

    const unsubSession = realtimeClient.on('session-update', (data: any) => {
      if (data.id === activeSession.id) {
        if (data.type === 'ended' || data.sessionStatus === 'ended') {
          clearSession();
          options.onSessionEnded?.(activeSession.id);
        } else {
          // Update session status
          setActiveSession(prev => prev ? { ...prev, sessionStatus: data.sessionStatus || 'active' } : null);
        }
      }
    });

    return () => {
      unsubSession();
      realtimeClient.leaveRoom(room);
    };
  }, [activeSession, clearSession, options]);

  // Timer countdown for remaining time
  useEffect(() => {
    if (!activeSession || !timeRemaining) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (!prev || prev <= 0) {
          clearInterval(interval);
          clearSession();
          options.onSessionExpired?.();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, clearSession, options]);

  // Initial restore on mount
  useEffect(() => {
    restoreSession();
  }, []);

  return {
    activeSession,
    timeRemaining,
    isLoading,
    saveSession,
    clearSession,
    storeUserId,
    refresh: restoreSession,
  };
}
