/**
 * hooks/useAuth.ts
 *
 * Authentication state extracted from App.tsx.
 * Uses cookie-backed auth with the Express backend.
 */

import { useEffect, useState, useCallback } from 'react';
import type { AnyUser, Coordinates } from '../types';
import type { ToastType } from '../components/ToastNotification';
import { websocketService } from '../services/websocketService';
import { getCurrentPosition } from '../services/locationService';
import { getCSRFHeaders, getCSRFToken } from '../services/csrfService';
import { getCurrentUser, requestPasswordReset, logout as authServiceLogout } from '../services/authService';
import { useCrossTabSync } from './useCrossTabSync';

interface UseAuthOptions {
  allUsers: AnyUser[];
  setAllUsers: React.Dispatch<React.SetStateAction<AnyUser[]>>;
  showNotification: (message: string, type?: ToastType) => void;
}

export function useAuth({ allUsers: _allUsers, setAllUsers, showNotification }: UseAuthOptions) {
  const [currentUser, setCurrentUser] = useState<AnyUser | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const { notifyLogin, notifyLogout, notifyAuthUpdate } = useCrossTabSync({
    // Disable cross-tab login/logout sync to allow testing parallel logins in different tabs
    /*
    onLogin: (user) => {
      console.log('Login detected in another tab');
      handleLogin(user, true);
    },
    onLogout: () => {
      console.log('Logout detected in another tab');
      handleLogout(true);
    },
    */
    onAuthUpdate: (user) => {
      handleUpdateUser(user, true);
    }
  });

  const handleLogin = useCallback((user: AnyUser, fromSync = false) => {
    setCurrentUser(user);
    try {
      // Use sessionStorage instead of localStorage to allow independent tabs for testing parallel logins
      sessionStorage.setItem('gyandeep_current_user', JSON.stringify(user));
    } catch (err) {
      console.warn('Persist user failed', err);
    }

    try {
      websocketService.connect(user.id, user.role);
    } catch (e: any) {
      console.warn('Real-time connection partial failure:', e?.message || e);
    }

    if (!fromSync) {
      notifyLogin(user);
      
      getCurrentPosition()
        .then(setUserLocation)
        .catch((err) => {
          console.error('Could not get user location:', err.message);
          showNotification('Location unavailable. GPS not enabled.', 'info');
        });
    }
  }, [notifyLogin, showNotification]);

  const handleLogout = useCallback((fromSync = false) => {
    setCurrentUser(null);
    setUserLocation(null);
    try {
      sessionStorage.removeItem('gyandeep_current_user');
      localStorage.removeItem('gyandeep_current_user'); // Clear legacy if exists
      localStorage.removeItem('gyandeep_token');
    } catch (err) {
      console.warn('Clear auth storage failed', err);
    }
    
    try {
      websocketService.disconnect();
    } catch (err) {
      console.warn('Realtime disconnect failed', err);
    }

    if (!fromSync) {
      notifyLogout();
      authServiceLogout();
    }
  }, [notifyLogout]);

  const handleUpdateUser = useCallback((updatedUser: AnyUser, fromSync = false) => {
    setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      try {
        sessionStorage.setItem('gyandeep_current_user', JSON.stringify(updatedUser));
      } catch (err) {
        console.warn('Persist updated user failed', err);
      }
      
      if (!fromSync) {
        notifyAuthUpdate(updatedUser);
      }
    }
  }, [currentUser, notifyAuthUpdate, setAllUsers]);

  // Handle face image update
  const handleUpdateFaceImage = useCallback(async (imageDataUrl: string) => {
    if (!currentUser) return;

    try {
      await getCSRFToken();
      const csrfHeaders = getCSRFHeaders();

      const response = await fetch('/api/auth/face-image', {
        method: 'PUT',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...csrfHeaders
        },
        body: JSON.stringify({ faceImage: imageDataUrl }),
      });

      if (response.ok) {
        const updatedUser = { ...currentUser, faceImage: imageDataUrl };
        handleUpdateUser(updatedUser);
      }
    } catch (err) {
      console.error('Failed to update face image:', err);
    }
  }, [currentUser, handleUpdateUser]);

  useEffect(() => {
    // Clear any stale session on initial load - force server verification
    // This fixes the issue where reloading loads old signed in account
    const clearStaleSession = () => {
      try {
        sessionStorage.removeItem('gyandeep_current_user');
        localStorage.removeItem('gyandeep_current_user');
      } catch (err) {
        console.warn('Clear stale session failed', err);
      }
    };

    getCurrentUser()
      .then((user) => {
        if (user) {
          handleLogin(user as AnyUser, true);
        } else {
          // No valid session - clear stored user and stay logged out
          clearStaleSession();
          if (currentUser) {
            handleLogout(true);
          }
        }
      })
      .catch((err) => {
        console.warn('Server unreachable during current user fetch', err);
        // Server down - clear stored session
        clearStaleSession();
      })
      .finally(() => {
        setIsInitializing(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
