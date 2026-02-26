/**
 * hooks/useAuth.ts
 *
 * Authentication state extracted from App.tsx.
 * Uses localStorage JWT when Supabase is not configured (self-hosted mode).
 */

import { useState, useEffect } from 'react';
import type { AnyUser } from '../types';
import type { ToastType } from '../components/ToastNotification';
import { websocketService } from '../services/websocketService';
import { getCurrentPosition } from '../services/locationService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { getCurrentUser, requestPasswordReset } from '../services/authService';
import type { Coordinates } from '../types';

interface UseAuthOptions {
  allUsers: AnyUser[];
  setAllUsers: React.Dispatch<React.SetStateAction<AnyUser[]>>;
  showNotification: (message: string, type?: ToastType) => void;
}

export function useAuth({ allUsers, setAllUsers, showNotification }: UseAuthOptions) {
  const [currentUser, setCurrentUser] = useState<AnyUser | null>(() => {
    // Restore session from localStorage on page reload
    try {
      const raw = localStorage.getItem('gyandeep_current_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  // ── Supabase auth state listener (only when properly configured) ───────────
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const user = await getCurrentUser();
          if (user) handleLogin(user as AnyUser);
        } catch (e) {
          console.error('Failed to load user after Supabase auth change:', e);
        }
      } else if (event === 'SIGNED_OUT') {
        handleLogout();
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogin = (user: AnyUser) => {
    setCurrentUser(user);
    // Persist session for page reloads
    try { localStorage.setItem('gyandeep_current_user', JSON.stringify(user)); } catch {}
    try { websocketService.connect(user.id, user.role); } catch (e: any) {
      console.warn('Real-time connection partial failure:', e?.message || e);
    }
    getCurrentPosition()
      .then(setUserLocation)
      .catch(err => {
        console.error('Could not get user location:', err.message);
        showNotification('Location unavailable. GPS not enabled.', 'info');
      });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserLocation(null);
    try { localStorage.removeItem('gyandeep_current_user'); } catch {}
    try { localStorage.removeItem('gyandeep_token'); } catch {}
    try { websocketService.disconnect(); } catch {}
  };

  const handleUpdateFaceImage = (userId: string, faceImage: string) => {
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, faceImage } : u));
    setCurrentUser(prev => prev?.id === userId ? { ...prev, faceImage } : prev);
    showNotification('Face ID updated successfully!', 'success');
  };

  const handleUpdateUser = (updatedUser: AnyUser) => {
    setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      try { localStorage.setItem('gyandeep_current_user', JSON.stringify(updatedUser)); } catch {}
    }
  };

  const handlePasswordReset = async (email: string): Promise<boolean> => {
    try {
      await requestPasswordReset(email);
      showNotification('Password reset email sent. Check your inbox.', 'success');
      return true;
    } catch (e: any) {
      showNotification(e?.message || 'Failed to send reset email.', 'error');
      return false;
    }
  };

  return {
    currentUser,
    setCurrentUser,
    userLocation,
    handleLogin,
    handleLogout,
    handleUpdateFaceImage,
    handleUpdateUser,
    handlePasswordReset,
  };
}
