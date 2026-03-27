/**
 * hooks/useAuth.ts
 *
 * Authentication state extracted from App.tsx.
 * Uses localStorage JWT with Express backend.
 */

import { useState, useEffect } from 'react';
import type { AnyUser } from '../types';
import type { ToastType } from '../components/ToastNotification';
import { websocketService } from '../services/websocketService';
import { getCurrentPosition } from '../services/locationService';
import { getCurrentUser, getStoredToken, requestPasswordReset } from '../services/authService';
import type { Coordinates } from '../types';

interface UseAuthOptions {
  setAllUsers: React.Dispatch<React.SetStateAction<AnyUser[]>>;
  showNotification: (message: string, type?: ToastType) => void;
}

export function useAuth({ setAllUsers, showNotification }: UseAuthOptions) {
  const [currentUser, setCurrentUser] = useState<AnyUser | null>(() => {
    // Restore session from localStorage on page reload
    try {
      const raw = localStorage.getItem('gyandeep_current_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  // ── Hydrate user from JWT on mount ──────────────────────────────────────────
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    // If we already have a cached user, try to refresh from server in background
    getCurrentUser().then(user => {
      if (user) handleLogin(user as AnyUser);
    }).catch((err) => {
      console.warn('Server unreachable during current user fetch', err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogin = (user: AnyUser) => {
    setCurrentUser(user);
    // Persist session for page reloads
    try { localStorage.setItem('gyandeep_current_user', JSON.stringify(user)); } catch (err) { console.warn('Persist user failed', err); }
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
    try { localStorage.removeItem('gyandeep_current_user'); } catch (err) { console.warn('Clear current user failed', err); }
    try { localStorage.removeItem('gyandeep_token'); } catch (err) { console.warn('Clear token failed', err); }
    try { websocketService.disconnect(); } catch (err) { console.warn('Realtime disconnect failed', err); }
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
      try { localStorage.setItem('gyandeep_current_user', JSON.stringify(updatedUser)); } catch (err) { console.warn('Persist updated user failed', err); }
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
