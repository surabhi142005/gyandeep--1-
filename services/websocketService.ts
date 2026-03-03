/**
 * services/websocketService.ts
 *
 * SSE-based realtime service replacing Supabase Realtime.
 * Same public interface: on(), emit(), connect(), disconnect().
 */

import { getStoredToken } from './authService';

const API_BASE = import.meta.env.VITE_API_URL || '';

class WebSocketService {
    private eventSource: EventSource | null = null;
    private connected: boolean = false;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private userId: string | null = null;
    private userRole: string | null = null;

    /**
     * Connect to SSE stream.
     */
    connect(userId: string, userRole: string): void {
        if (this.connected && this.eventSource) return;
        this.userId = userId;
        this.userRole = userRole;

        const token = getStoredToken();
        if (!token) {
            console.warn('Cannot connect SSE: no auth token');
            return;
        }

        this.setupEventSource(token);
    }

    private setupEventSource(token: string): void {
        try {
            this.eventSource = new EventSource(`${API_BASE}/api/events?token=${encodeURIComponent(token)}`);

            this.eventSource.onopen = () => {
                this.connected = true;
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
                console.log('Connected to SSE stream');
            };

            this.eventSource.onmessage = (evt) => {
                try {
                    const data = JSON.parse(evt.data);
                    if (data.event) {
                        this.notifyListeners(data.event, data.payload);
                    }
                } catch {
                    // ignore malformed messages
                }
            };

            this.eventSource.onerror = () => {
                this.connected = false;
                this.eventSource?.close();
                this.eventSource = null;

                // Auto-reconnect after 5 seconds
                if (!this.reconnectTimer) {
                    this.reconnectTimer = setTimeout(() => {
                        this.reconnectTimer = null;
                        const t = getStoredToken();
                        if (t) this.setupEventSource(t);
                    }, 5000);
                }
            };
        } catch (e) {
            console.warn('SSE connection failed:', e);
        }
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
        const token = getStoredToken();
        if (!token) {
            console.warn('Cannot emit event: no auth token');
            return;
        }
        fetch(`${API_BASE}/api/events/broadcast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ event, payload: data }),
        }).catch(() => {
            console.warn('Failed to broadcast event:', event);
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
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.connected = false;
        this.listeners.clear();
        console.log('Disconnected from SSE stream');
    }
}

export const websocketService = new WebSocketService();
