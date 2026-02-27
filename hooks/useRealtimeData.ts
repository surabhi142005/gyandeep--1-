/**
 * hooks/useRealtimeData.ts
 *
 * Generic realtime refresh hook.
 *
 * Subscribe to one or more websocket events and call a data-refresh function
 * whenever the server broadcasts a relevant mutation.  Automatically cleans
 * up subscriptions on unmount.
 *
 * Usage:
 *   // Refresh grades list whenever the server signals a change
 *   useRealtimeData(['grades-changed'], fetchMyGrades);
 *
 *   // Refresh timetable + tickets together
 *   useRealtimeData(['timetable-changed', 'tickets-changed'], reloadAll);
 */

import { useEffect, useRef } from 'react';
import { websocketService } from '../services/websocketService';

export type RealtimeEvent =
    | 'grades-changed'
    | 'timetable-changed'
    | 'tickets-changed'
    | 'attendance-changed'
    | 'performance-changed'
    | 'quiz-submission'
    | 'session-changed'
    | 'session-ended'
    | 'engagement-update'
    | 'blockchain-update'
    | 'digital-twin-changed'
    | 'new-chat-message'
    | 'notification';

interface UseRealtimeDataOptions {
    /**
     * Minimum milliseconds between consecutive refreshes triggered by rapid
     * bursts of events (e.g. bulk grade import emitting 50 events).
     * Defaults to 500 ms.
     */
    debounceMs?: number;
    /**
     * When true, trigger an immediate refresh on mount in addition to reacting
     * to live events.  Defaults to false.
     */
    refreshOnMount?: boolean;
}

/**
 * @param events   Array of broadcast event names to subscribe to.
 * @param onRefresh Async (or sync) function that re-fetches the relevant data.
 * @param options  Optional tuning parameters.
 */
export function useRealtimeData(
    events: RealtimeEvent[],
    onRefresh: () => void | Promise<void>,
    options: UseRealtimeDataOptions = {},
): void {
    const { debounceMs = 500, refreshOnMount = false } = options;

    // Stable ref so the latest onRefresh is always called even if the component
    // re-renders and passes a new callback reference.
    const refreshRef = useRef(onRefresh);
    useEffect(() => {
        refreshRef.current = onRefresh;
    }, [onRefresh]);

    // Debounce timer ref to coalesce rapid events.
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const trigger = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                try {
                    void refreshRef.current();
                } catch (err) {
                    console.warn('[useRealtimeData] refresh error', err);
                }
            }, debounceMs);
        };

        // Initial load
        if (refreshOnMount) trigger();

        // Subscribe to all requested events
        const unsubscribers = events.map(event => websocketService.on(event, trigger));

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            unsubscribers.forEach(unsub => unsub());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounceMs, refreshOnMount, JSON.stringify(events)]);
}

// ─── Convenience wrappers ────────────────────────────────────────────────────

/** Refreshes when grades are created, bulk-created, or deleted. */
export function useGradesRealtime(onRefresh: () => void | Promise<void>, opts?: UseRealtimeDataOptions) {
    return useRealtimeData(['grades-changed'], onRefresh, opts);
}

/** Refreshes when a timetable entry is created, updated, or deleted. */
export function useTimetableRealtime(onRefresh: () => void | Promise<void>, opts?: UseRealtimeDataOptions) {
    return useRealtimeData(['timetable-changed'], onRefresh, opts);
}

/** Refreshes when a helpdesk ticket is created, replied to, or closed. */
export function useTicketsRealtime(onRefresh: () => void | Promise<void>, opts?: UseRealtimeDataOptions) {
    return useRealtimeData(['tickets-changed'], onRefresh, opts);
}

/** Refreshes notifications when a new one arrives (via broadcast or postgres_changes). */
export function useNotificationsRealtime(onRefresh: () => void | Promise<void>, opts?: UseRealtimeDataOptions) {
    return useRealtimeData(['notification'], onRefresh, opts);
}

/** Combined hook for components that need attendance + performance updates. */
export function useAttendanceRealtime(onRefresh: () => void | Promise<void>, opts?: UseRealtimeDataOptions) {
    return useRealtimeData(['attendance-changed', 'performance-changed'], onRefresh, opts);
}
