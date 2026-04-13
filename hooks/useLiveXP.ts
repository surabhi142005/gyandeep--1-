/**
 * hooks/useLiveXP.ts
 * Real-time XP and leaderboard updates with animations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeClient } from '../services/realtimeClient';

interface XPState {
  current: number;
  previous: number;
  isAnimating: boolean;
  delta: number;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  earnedAt: Date;
}

interface UseLiveXPOptions {
  userId?: string;
  initialXP?: number;
  initialLevel?: number;
}

export function useLiveXP({ userId, initialXP = 0, initialLevel = 1 }: UseLiveXPOptions) {
  const [xp, setXP] = useState<XPState>({
    current: initialXP,
    previous: initialXP,
    isAnimating: false,
    delta: 0,
  });
  const [level, setLevel] = useState(initialLevel);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate level based on XP
  const calculateLevel = useCallback((xpValue: number) => {
    // Level up every 100 XP
    return Math.floor(xpValue / 100) + 1;
  }, []);

  // Animate XP gain
  const animateXPGain = useCallback((amount: number) => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    setXP(prev => {
      const newCurrent = prev.current + amount;
      return {
        current: newCurrent,
        previous: prev.current,
        isAnimating: true,
        delta: amount,
      };
    });

    // Check for level up
    const newLevel = calculateLevel(xp.current + amount);
    if (newLevel > level) {
      setLevel(newLevel);
    }

    // End animation after 2 seconds
    animationTimeoutRef.current = setTimeout(() => {
      setXP(prev => ({
        ...prev,
        previous: prev.current,
        isAnimating: false,
        delta: 0,
      }));
    }, 2000);
  }, [level, xp.current, calculateLevel]);

  // WebSocket listener for XP updates
  useEffect(() => {
    if (!userId) return;

    const unsub = realtimeClient.on('xp_updated', (data) => {
      console.log('[LiveXP] Received update:', data);

      if (data.studentId === userId) {
        // Update own XP
        animateXPGain(data.xpAwarded);
      }
    });

    const unsubNotification = realtimeClient.on('notification', (data) => {
      if (data.type === 'badge_earned' && data.studentId === userId) {
        const badge: Badge = {
          id: data.badgeId,
          name: data.badgeName,
          icon: data.badgeIcon,
          earnedAt: new Date(data.earnedAt || Date.now()),
        };
        setBadges(prev => [...prev, badge]);
        setNewBadge(badge);

        // Clear new badge notification after 5 seconds
        setTimeout(() => setNewBadge(null), 5000);
      }
    });

    return () => {
      unsub();
      unsubNotification();
    };
  }, [userId, animateXPGain]);

  // Fetch current XP from server
  const refreshXP = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/users/${userId}/xp`);
      if (response.ok) {
        const data = await response.json();
        setXP({
          current: data.xp || 0,
          previous: data.xp || 0,
          isAnimating: false,
          delta: 0,
        });
        setLevel(calculateLevel(data.xp || 0));
        if (data.badges) {
          setBadges(data.badges.map((b: any) => ({
            id: b.id,
            name: b.name,
            icon: b.icon,
            earnedAt: new Date(b.earnedAt),
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch XP:', error);
    }
  }, [userId, calculateLevel]);

  // Dismiss new badge notification
  const dismissBadgeNotification = useCallback(() => {
    setNewBadge(null);
  }, []);

  return {
    xp: xp.current,
    previousXP: xp.previous,
    isAnimating: xp.isAnimating,
    xpDelta: xp.delta,
    level,
    badges,
    newBadge,
    dismissBadgeNotification,
    refreshXP,
  };
}

// Hook for leaderboard with real-time updates
export function useLiveLeaderboard(classId?: string) {
  const [leaderboard, setLeaderboard] = useState<Array<{
    studentId: string;
    name: string;
    xp: number;
    level: number;
    faceImage?: string;
  }>>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const url = classId
        ? `/api/analytics/leaderboard?classId=${classId}`
        : '/api/analytics/leaderboard';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  }, [classId]);

  // Listen for XP updates to refresh leaderboard
  useEffect(() => {
    const unsub = realtimeClient.on('xp_updated', () => {
      // Refresh leaderboard when anyone gains XP
      fetchLeaderboard();
    });

    return () => unsub();
  }, [fetchLeaderboard]);

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard();

    // Poll every 30 seconds as fallback
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    lastUpdate,
    refresh: fetchLeaderboard,
  };
}
