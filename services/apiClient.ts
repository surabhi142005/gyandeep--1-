/**
 * services/apiClient.ts
 * Configured axios/fetch client with token refresh
 */

import { tokenManager } from './tokenManager';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  _retry?: boolean;
}

class ApiClient {
  private refreshPromise: Promise<any> | null = null;

  async fetch(url: string, options: FetchOptions = {}): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

    // Ensure we have a valid token
    let token = tokenManager.getAccessToken();

    if (token && tokenManager.isTokenExpired()) {
      // Token expired, try to refresh
      if (!this.refreshPromise) {
        this.refreshPromise = tokenManager.refreshToken();
      }

      const newTokens = await this.refreshPromise;
      this.refreshPromise = null;

      if (!newTokens) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        throw new Error('Session expired');
      }

      token = newTokens.accessToken;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      // Handle 401 by retrying once after token refresh
      if (response.status === 401 && options._retry !== true) {
        const newTokens = await tokenManager.refreshToken();
        if (newTokens) {
          headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return this.fetch(fullUrl, {
            ...options,
            headers,
            _retry: true, // Prevent infinite loop
          });
        }

        // Refresh failed
        window.location.href = '/login';
        throw new Error('Session expired');
      }

      return response;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error - server unreachable');
      }
      throw error;
    }
  }

  // Convenience methods
  get(url: string, options?: FetchOptions): Promise<Response> {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  post(url: string, body: any, options?: FetchOptions): Promise<Response> {
    return this.fetch(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch(url: string, body: any, options?: FetchOptions): Promise<Response> {
    return this.fetch(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(url: string, options?: FetchOptions): Promise<Response> {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

// Legacy axios-like interface for compatibility
export const axiosLike = {
  get: (url: string, config?: any) => apiClient.get(url, config).then(r => r.json()),
  post: (url: string, data?: any, config?: any) =>
    apiClient.post(url, data, config).then(r => r.json()),
  patch: (url: string, data?: any, config?: any) =>
    apiClient.patch(url, data, config).then(r => r.json()),
  delete: (url: string, config?: any) =>
    apiClient.delete(url, config).then(r => r.json()),
};
