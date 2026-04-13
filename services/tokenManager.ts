/**
 * services/tokenManager.ts
 * Manages JWT tokens with automatic refresh
 */

import { jwtDecode } from 'jwt-decode';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface DecodedToken {
  exp: number;
  id: string;
  role: string;
  email: string;
}

const TOKEN_KEY = 'gyandeep_tokens';
const REFRESH_BUFFER = 60000; // Refresh 1 minute before expiry

class TokenManager {
  private refreshPromise: Promise<TokenData | null> | null = null;
  private onTokenRefreshCallbacks: Set<(tokens: TokenData) => void> = new Set();
  private onLogoutCallbacks: Set<() => void> = new Set();

  getTokens(): TokenData | null {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  setTokens(tokens: TokenData): void {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    this.onTokenRefreshCallbacks.forEach(cb => cb(tokens));
  }

  clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.onLogoutCallbacks.forEach(cb => cb());
  }

  onLogout(callback: () => void): () => void {
    this.onLogoutCallbacks.add(callback);
    return () => this.onLogoutCallbacks.delete(callback);
  }

  getAccessToken(): string | null {
    return this.getTokens()?.accessToken || null;
  }

  isTokenValid(): boolean {
    const tokens = this.getTokens();
    if (!tokens) return false;

    try {
      const decoded = jwtDecode<DecodedToken>(tokens.accessToken);
      return decoded.exp * 1000 > Date.now() + REFRESH_BUFFER;
    } catch {
      return false;
    }
  }

  isTokenExpired(): boolean {
    const tokens = this.getTokens();
    if (!tokens) return true;

    try {
      const decoded = jwtDecode<DecodedToken>(tokens.accessToken);
      return decoded.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  async refreshToken(): Promise<TokenData | null> {
    const tokens = this.getTokens();
    if (!tokens?.refreshToken) return null;

    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this.performRefresh(tokens.refreshToken);

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(refreshToken: string): Promise<TokenData | null> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const tokens: TokenData = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      };

      this.setTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return null;
    }
  }

  onTokenRefresh(callback: (tokens: TokenData) => void): () => void {
    this.onTokenRefreshCallbacks.add(callback);
    return () => this.onTokenRefreshCallbacks.delete(callback);
  }

  getUserId(): string | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded.id;
    } catch {
      return null;
    }
  }

  getUserRole(): string | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded.role;
    } catch {
      return null;
    }
  }
}

export const tokenManager = new TokenManager();

// Axios interceptor helper
export function setupAxiosInterceptors(axiosInstance: any) {
  // Request interceptor - add token
  axiosInstance.interceptors.request.use(
    async (config: any) => {
      const token = tokenManager.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: any) => Promise.reject(error)
  );

  // Response interceptor - handle token refresh
  axiosInstance.interceptors.response.use(
    (response: any) => response,
    async (error: any) => {
      const originalRequest = error.config;

      // If 401 and not already retried
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const newTokens = await tokenManager.refreshToken();
        if (newTokens) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return axiosInstance(originalRequest);
        }

        // Refresh failed - redirect to login
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }
  );
}
