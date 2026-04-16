/**
 * hooks/useLiveLeaderboard.ts
 * Real-time XP and leaderboard updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeClient } from '../services/realtimeClient';

interface LeaderboardEntry {
  id: string;
  name: string;
  xp: number;
  level: number;
  coins: number;
  badges: string[];
  faceImage?: string;
}

interface XpGain {
  xpAwarded: number;
  coinsAwarded?: number;
  source: string;
  timestamp: Date;
}

interface UseLiveLeaderboardOptions {
  currentUserId?: string;
  classId?: string;
}

export function useLiveLeaderboard({ currentUserId, classId }: UseLiveLeaderboardOptions = {}) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null);
  const [recentGains, setRecentGains] = useState<XpGain[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = classId ? `?classId=${classId}` : '';
      const response = await fetch(`/api/leaderboard${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        // Sort by XP descending
        const sorted = data.sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.xp - a.xp);
        setLeaderboard(sorted);

        // Find current user
        if (currentUserId) {
          const user = sorted.find((u: LeaderboardEntry) => u.id === currentUserId);
          if (user) setCurrentUser(user);
        }
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [classId, currentUserId]);

  // WebSocket listener for XP updates
  useEffect(() => {
    // Initial fetch
    fetchLeaderboard();

    // Poll every 30 seconds as fallback
    const pollInterval = setInterval(fetchLeaderboard, 30000);

    // WebSocket real-time updates
    const unsubXp = realtimeClient.on('xp_updated', (data) => {
      console.log('[Leaderboard] XP update received:', data);

      // Add to recent gains
      const gain: XpGain = {
        xpAwarded: data.xpAwarded,
        coinsAwarded: data.coinsAwarded,
        source: data.source || 'unknown',
        timestamp: new Date(),
      };

      setRecentGains(prev => [gain, ...prev].slice(0, 5));

      // Update leaderboard optimistically
      setLeaderboard(prev => {
        const updated = prev.map(entry => {
          if (entry.id === data.studentId) {
            return {
              ...entry,
              xp: data.totalXp ?? data.xp ?? entry.xp,
              coins: data.coins ?? entry.coins,
            };
          }
          return entry;
        });

        // Re-sort by XP
        return updated.sort((a, b) => b.xp - a.xp);
      });

      // Update current user if it's us
      if (currentUserId && data.studentId === currentUserId && currentUser) {
        setCurrentUser(prev => prev ? {
          ...prev,
          xp: prev.xp + (data.xpAwarded || 0),
          coins: prev.coins + (data.coinsAwarded || 0),
          level: Math.floor((prev.xp + (data.xpAwarded || 0)) / 100) + 1,
        } : null);
      }

      setLastUpdate(new Date());
    });

    // Listen for new badges
    const unsubBadge = realtimeClient.on('badge_earned', (data) => {
      setLeaderboard(prev => prev.map(entry => {
        if (entry.id === data.studentId) {
          return {
            ...entry,
            badges: [...entry.badges, data.badgeId],
          };
        }
        return entry;
      }));
    });

    return () => {
      clearInterval(pollInterval);
      unsubXp();
      unsubBadge();
    };
  }, [fetchLeaderboard, currentUserId]);

  // Get user's rank
  const getUserRank = useCallback((userId: string) => {
    const index = leaderboard.findIndex(u => u.id === userId);
    return index >= 0 ? index + 1 : null;
  }, [leaderboard]);

  // Animated XP counter
  const [animatedXp, setAnimatedXp] = useState(currentUser?.xp || 0);

  useEffect(() => {
    if (currentUser && currentUser.xp !== animatedXp) {
      const target = currentUser.xp;
      const diff = target - animatedXp;
      const steps = 20;
      const increment = diff / steps;
      let current = animatedXp;

      const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
          setAnimatedXp(target);
          clearInterval(timer);
        } else {
          setAnimatedXp(Math.round(current));
        }
      }, 50);

      return () => clearInterval(timer);
    }
  }, [currentUser?.xp]);

  return {
    leaderboard,
    currentUser,
    currentUserRank: currentUserId ? getUserRank(currentUserId) : null,
    recentGains,
    animatedXp,
    lastUpdate,
    isLoading,
    refresh: fetchLeaderboard,
    getUserRank,
  };
}
