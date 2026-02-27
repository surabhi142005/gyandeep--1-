import { supabase } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

const BROADCAST_EVENTS = [
  'attendance-changed',
  'performance-changed',
  'grades-changed',
  'timetable-changed',
  'tickets-changed',
  'quiz-submission',
  'session-changed',
  'session-ended',
  'engagement-update',
  'blockchain-update',
  'digital-twin-changed',
  'new-chat-message'
] as const;

class WebSocketService {
    private channel: RealtimeChannel | null = null;
    private notificationChannel: RealtimeChannel | null = null;
    private connected: boolean = false;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();
    private userId: string | null = null;

    /**
     * Connect to Supabase Realtime.
     */
    connect(userId: string, userRole: string, _token?: string, _url?: string): void {
        if (this.connected) return;
        this.userId = userId;

        // Create broadcast channel for custom classroom events
        this.channel = supabase.channel('classroom', {
            config: {
                broadcast: { self: true },
                presence: { key: userId }
            }
        });

        // Subscribe to all broadcast events
        for (const event of BROADCAST_EVENTS) {
            this.channel.on('broadcast', { event }, ({ payload }) => {
                this.notifyListeners(event, payload);
            });
        }

        // Track presence
        this.channel.on('presence', { event: 'sync' }, () => {
            const state = this.channel?.presenceState() || {};
            this.notifyListeners('presence-sync', state);
        });

        this.channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                this.connected = true;
                console.log('Connected to Supabase Realtime');

                // Track user presence
                await this.channel?.track({ userId, role: userRole, online_at: new Date().toISOString() });
            }
        });

        // Subscribe to notification changes via postgres_changes
        this.notificationChannel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    this.notifyListeners('notification', payload.new);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: 'user_id=eq.all'
                },
                (payload) => {
                    this.notifyListeners('notification', payload.new);
                }
            )
            .subscribe();
    }

    private notifyListeners(event: string, data: any): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => callback(data));
        }
    }

    on(event: string, callback: (data: any) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    emit(event: string, data: any): void {
        if (!this.channel) {
            console.warn('Cannot emit event: Realtime not connected');
            return;
        }
        this.channel.send({
            type: 'broadcast',
            event,
            payload: data
        });
    }

    sendAttendanceUpdate(data: any): void {
        this.emit('attendance-changed', data);
    }

    sendPerformanceUpdate(data: any): void {
        this.emit('performance-changed', data);
    }


    sendGradesUpdate(data: any): void {
        this.emit('grades-changed', data);
    }

    sendTimetableUpdate(data: any): void {
        this.emit('timetable-changed', data);
    }

    sendTicketsUpdate(data: any): void {
        this.emit('tickets-changed', data);
    }

    sendQuizSubmission(data: any): void {
        this.emit('quiz-submission', data);
    }

    sendSessionUpdate(data: any): void {
        this.emit('session-changed', data);
    }

    sendBlockchainUpdate(data: any): void {
        this.emit('blockchain-update', data);
    }

    sendDigitalTwinUpdate(data: any): void {
        this.emit('digital-twin-changed', data);
    }

    sendEngagementMetric(data: any): void {
        this.emit('engagement-update', data);
    }

    isConnected(): boolean {
        return this.connected;
    }

    disconnect(): void {
        if (this.channel) {
            supabase.removeChannel(this.channel);
            this.channel = null;
        }
        if (this.notificationChannel) {
            supabase.removeChannel(this.notificationChannel);
            this.notificationChannel = null;
        }
        this.connected = false;
        this.listeners.clear();
        console.log('Disconnected from Supabase Realtime');
    }
}

export const websocketService = new WebSocketService();
