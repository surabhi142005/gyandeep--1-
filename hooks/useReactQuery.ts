/**
 * hooks/useReactQuery.ts
 * React Query provider and hooks for data fetching with optimistic updates
 */

import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { getStoredToken } from '../services/authService';
import { toast } from '../services/toastService';

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

// ============================================================================
// Basic Data Fetching Hooks
// ============================================================================

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

// ============================================================================
// Optimistic Mutation Types
// ============================================================================

interface OptimisticConfig<TData = any, TVariables = any> {
  /** Query key(s) to update optimistically */
  queryKey: QueryKey | QueryKey[];
  /** Function to update cache with optimistic data */
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
  /** Optional rollback function on error */
  rollbackFn?: (oldData: TData | undefined, variables: TVariables, error: Error) => TData;
}

interface MutationToastConfig {
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
}

// ============================================================================
// Enhanced Mutation with Optimistic Updates and Toast Notifications
// ============================================================================

export function useApiMutation(
  endpoint: string,
  method: string = 'POST',
  options?: {
    invalidateQueries?: QueryKey | QueryKey[];
    optimistic?: OptimisticConfig;
    toast?: MutationToastConfig;
  }
) {
  const queryClient = useQueryClient();
  const _toastId = `${endpoint}-${method}-${Date.now()}`;

  return useMutation({
    mutationFn: (data?: any) => fetchAPI(endpoint, {
      method,
      body: data ? JSON.stringify(data) : undefined,
    }),

    onMutate: async (variables) => {
      const loadingToastId = options?.toast?.loadingMessage 
        ? toast.loading(options.toast.loadingMessage)
        : null;

      if (!options?.optimistic) return { previousData: undefined, loadingToastId };

      const { queryKey, updateFn } = options.optimistic;
      const keys = Array.isArray(queryKey) && !Array.isArray(queryKey[0])
        ? [queryKey as QueryKey]
        : [queryKey as QueryKey];

      await Promise.all(keys.map(key => queryClient.cancelQueries({ queryKey: key })));

      const previousData = new Map<QueryKey, any>();
      keys.forEach(key => {
        previousData.set(key, queryClient.getQueryData(key));
      });

      keys.forEach(key => {
        queryClient.setQueryData(key, (old: any) => updateFn(old, variables));
      });

      return { previousData, keys, loadingToastId };
    },

    onSuccess: (_data, _variables, context) => {
      if (context?.loadingToastId) {
        toast.remove(context.loadingToastId);
      }

      if (options?.invalidateQueries) {
        const keys = Array.isArray(options.invalidateQueries) && !Array.isArray(options.invalidateQueries[0])
          ? options.invalidateQueries as QueryKey[]
          : [options.invalidateQueries as QueryKey];
        keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
      }

      if (options?.toast?.successMessage) {
        toast.success(options.toast.successMessage);
      }
    },

    onError: (error: Error, _variables, context: any) => {
      if (context?.loadingToastId) {
        toast.remove(context.loadingToastId);
      }

      if (context?.previousData && options?.optimistic) {
        context.previousData.forEach((data: any, key: QueryKey) => {
          if (options.optimistic?.rollbackFn && context?.keys) {
            const currentData = queryClient.getQueryData(key);
            queryClient.setQueryData(key, options.optimistic.rollbackFn(currentData, _variables, error));
          } else {
            queryClient.setQueryData(key, data);
          }
        });
      }

      const errorMsg = options?.toast?.errorMessage || error.message;
      toast.error(errorMsg);
    },

    onSettled: (_data, _error, _variables, context) => {
      if (options?.optimistic?.queryKey) {
        const keys = Array.isArray(options.optimistic.queryKey) && !Array.isArray(options.optimistic.queryKey[0])
          ? [options.optimistic.queryKey as QueryKey]
          : [options.optimistic.queryKey as QueryKey];
        keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
      }
    },
  });
}

// ============================================================================
// Specialized Optimistic Mutation Hooks
// ============================================================================

/**
 * Optimistic mutation for creating items
 * Adds the new item to the beginning of the list immediately
 */
export function useOptimisticCreate<T extends { id: string }>(
  endpoint: string,
  listQueryKey: QueryKey,
  options?: {
    generateId?: () => string;
    toast?: MutationToastConfig;
  }
) {
  return useApiMutation(endpoint, 'POST', {
    invalidateQueries: listQueryKey,
    optimistic: {
      queryKey: listQueryKey,
      updateFn: (oldData: T[] | undefined, variables: T) => {
        const newItem = {
          ...variables,
          id: options?.generateId?.() || `temp-${Date.now()}`,
          _optimistic: true,
          createdAt: new Date().toISOString(),
        };
        return [newItem, ...(oldData || [])];
      },
    },
    toast: options?.toast,
  });
}

/**
 * Optimistic mutation for updating items
 * Updates the item in the list immediately
 */
export function useOptimisticUpdate<T extends { id: string }>(
  endpoint: string,
  listQueryKey: QueryKey,
  options?: { toast?: MutationToastConfig }
) {
  return useApiMutation(endpoint, 'PATCH', {
    invalidateQueries: listQueryKey,
    optimistic: {
      queryKey: listQueryKey,
      updateFn: (oldData: T[] | undefined, variables: Partial<T> & { id: string }) => {
        if (!oldData) return oldData;
        return oldData.map(item =>
          item.id === variables.id ? { ...item, ...variables, _optimistic: true } : item
        );
      },
    },
    toast: options?.toast,
  });
}

/**
 * Optimistic mutation for deleting items
 * Removes the item from the list immediately
 */
export function useOptimisticDelete<T extends { id: string }>(
  endpoint: string,
  listQueryKey: QueryKey,
  options?: { toast?: MutationToastConfig }
) {
  return useApiMutation(endpoint, 'DELETE', {
    invalidateQueries: listQueryKey,
    optimistic: {
      queryKey: listQueryKey,
      updateFn: (oldData: T[] | undefined, variables: { id: string }) => {
        if (!oldData) return oldData;
        return oldData.filter(item => item.id !== variables.id);
      },
    },
    toast: options?.toast,
  });
}

/**
 * Bulk operation with optimistic updates
 * For batch create/update/delete operations
 */
export function useOptimisticBulk<T extends { id: string }>(
  endpoint: string,
  listQueryKey: QueryKey,
  operation: 'create' | 'update' | 'delete',
  options?: { toast?: MutationToastConfig }
) {
  const updateFns = {
    create: (oldData: T[] | undefined, variables: { items: T[] }) => {
      const newItems = variables.items.map(item => ({
        ...item,
        id: item.id || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        _optimistic: true,
      }));
      return [...newItems, ...(oldData || [])];
    },
    update: (oldData: T[] | undefined, variables: { items: Partial<T> & { id: string }[] }) => {
      if (!oldData) return oldData;
      return oldData.map(item => {
        const update = variables.items.find(u => u.id === item.id);
        return update ? { ...item, ...update, _optimistic: true } : item;
      });
    },
    delete: (oldData: T[] | undefined, variables: { ids: string[] }) => {
      if (!oldData) return oldData;
      return oldData.filter(item => !variables.ids.includes(item.id));
    },
  };

  return useApiMutation(endpoint, 'POST', {
    invalidateQueries: listQueryKey,
    optimistic: {
      queryKey: listQueryKey,
      updateFn: updateFns[operation],
    },
    toast: options?.toast,
  });
}

// ============================================================================
// Entity-Specific Hooks with Optimistic Updates
// ============================================================================

export function useUsers() {
  return useApi('/api/users');
}

export function useClasses() {
  return useApi('/api/classes');
}

export function useGrades(studentId?: string) {
  return useApi(studentId ? `/api/grades?studentId=${studentId}` : '/api/grades');
}

interface UseGradesPaginatedOptions {
  studentId?: string;
  subjectId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useGradesPaginated(options?: UseGradesPaginatedOptions) {
  const params = new URLSearchParams();
  if (options?.studentId) params.set('studentId', options.studentId);
  if (options?.subjectId) params.set('subjectId', options.subjectId);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

  const queryString = params.toString();
  return useApi(`/api/grades${queryString ? `?${queryString}` : ''}`);
}

interface UseAttendanceOptions {
  studentId?: string;
  classId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export function useAttendance(options?: UseAttendanceOptions) {
  const params = new URLSearchParams();
  if (options?.studentId) params.set('studentId', options.studentId);
  if (options?.classId) params.set('classId', options.classId);
  if (options?.status) params.set('status', options.status);
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);

  const queryString = params.toString();
  return useApi(`/api/attendance${queryString ? `?${queryString}` : ''}`);
}

interface UseAttendancePaginatedOptions extends UseAttendanceOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useAttendancePaginated(options?: UseAttendancePaginatedOptions) {
  const params = new URLSearchParams();
  if (options?.studentId) params.set('studentId', options.studentId);
  if (options?.classId) params.set('classId', options.classId);
  if (options?.status) params.set('status', options.status);
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

  const queryString = params.toString();
  return useApi(`/api/attendance${queryString ? `?${queryString}` : ''}`);
}

export function useAttendanceStats(options?: { studentId?: string; classId?: string; startDate?: string; endDate?: string }) {
  const params = new URLSearchParams();
  if (options?.studentId) params.set('studentId', options.studentId);
  if (options?.classId) params.set('classId', options.classId);
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);

  const queryString = params.toString();
  return useApi(`/api/attendance/stats${queryString ? `?${queryString}` : ''}`);
}

export function useCreateAttendance() {
  return useOptimisticCreate('/api/attendance', ['/api/attendance'], {
    toast: {
      successMessage: 'Attendance recorded',
      errorMessage: 'Failed to record attendance',
    },
  });
}

export function useUpdateAttendance() {
  return useOptimisticUpdate('/api/attendance', ['/api/attendance'], {
    toast: {
      successMessage: 'Attendance updated',
      errorMessage: 'Failed to update attendance',
    },
  });
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

// Optimistic grade mutations
export function useCreateGrade() {
  return useOptimisticCreate('/api/grades', ['/api/grades'], {
    toast: {
      successMessage: 'Grade added successfully',
      errorMessage: 'Failed to add grade',
    },
  });
}

export function useUpdateGrade() {
  return useOptimisticUpdate('/api/grades', ['/api/grades'], {
    toast: {
      successMessage: 'Grade updated successfully',
      errorMessage: 'Failed to update grade',
    },
  });
}

export function useDeleteGrade() {
  return useOptimisticDelete('/api/grades', ['/api/grades'], {
    toast: {
      successMessage: 'Grade deleted successfully',
      errorMessage: 'Failed to delete grade',
    },
  });
}

// Optimistic ticket mutations
export function useCreateTicket() {
  return useOptimisticCreate('/api/tickets', ['/api/tickets'], {
    toast: {
      successMessage: 'Ticket created successfully',
      errorMessage: 'Failed to create ticket',
    },
  });
}

export function useUpdateTicket() {
  return useOptimisticUpdate('/api/tickets', ['/api/tickets'], {
    toast: {
      successMessage: 'Ticket updated successfully',
      errorMessage: 'Failed to update ticket',
    },
  });
}

export function useCloseTicket() {
  return useApiMutation('/api/tickets', 'PATCH', {
    invalidateQueries: ['/api/tickets'],
    toast: {
      successMessage: 'Ticket closed successfully',
      errorMessage: 'Failed to close ticket',
    },
  });
}

// Optimistic timetable mutations
export function useCreateTimetableEntry() {
  return useOptimisticCreate('/api/timetable/entry', ['/api/timetable'], {
    toast: {
      successMessage: 'Timetable entry added',
      errorMessage: 'Failed to add timetable entry',
    },
  });
}

export function useDeleteTimetableEntry() {
  return useOptimisticDelete('/api/timetable', ['/api/timetable'], {
    toast: {
      successMessage: 'Timetable entry removed',
      errorMessage: 'Failed to remove timetable entry',
    },
  });
}

// Bulk operations
export function useBulkImportUsers() {
  return useApiMutation('/api/users/bulk', 'POST', {
    invalidateQueries: ['/api/users'],
    toast: {
      successMessage: 'Users imported successfully',
      errorMessage: 'Failed to import users',
    },
  });
}

export function useBulkCreateGrades() {
  return useOptimisticBulk('/api/grades/bulk', ['/api/grades'], 'create', {
    toast: {
      successMessage: 'Grades added successfully',
      errorMessage: 'Failed to add grades',
    },
  });
}

export { fetchAPI };
export { useQueryClient };
