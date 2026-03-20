/**
 * hooks/useReactQuery.ts
 * React Query provider and hooks for data fetching
 */

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStoredToken } from '../services/authService';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export function useApi(endpoint: string, options?: {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: [endpoint],
    queryFn: () => fetchAPI(endpoint),
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime || 5 * 60 * 1000,
    retry: 1,
  });
}

export function useApiMutation(endpoint: string, method: string = 'POST') {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data?: any) => fetchAPI(endpoint, {
      method,
      body: data ? JSON.stringify(data) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    },
  });
}

export function useUsers() {
  return useApi('/api/users');
}

export function useClasses() {
  return useApi('/api/classes');
}

export function useGrades(studentId?: string) {
  return useApi(studentId ? `/api/grades?studentId=${studentId}` : '/api/grades');
}

export function useTimetable() {
  return useApi('/api/timetable');
}

export function useTickets() {
  return useApi('/api/tickets');
}

export function useNotifications() {
  return useApi('/api/notifications', {
    refetchInterval: 30 * 1000,
  });
}

export function useQuestionBank() {
  return useApi('/api/question-bank');
}

export function useCreateGrade() {
  return useApiMutation('/api/grades', 'POST');
}

export function useCreateTicket() {
  return useApiMutation('/api/tickets', 'POST');
}

export function useUpdateTicket() {
  return useApiMutation('/api/tickets', 'PATCH');
}

export function useCreateTimetableEntry() {
  return useApiMutation('/api/timetable/entry', 'POST');
}

export function useBulkImportUsers() {
  return useApiMutation('/api/users/bulk', 'POST');
}

export { fetchAPI };
export { QueryClient, QueryClientProvider, useQueryClient };
