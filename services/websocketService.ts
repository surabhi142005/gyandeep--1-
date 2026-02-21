import { io, Socket } from 'socket.io-client';
import type { WebSocketMessage } from '../types';

class WebSocketService {
    private socket: Socket | null = null;
    private connected: boolean = false;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();

    /**
     * Connect to WebSocket server
     */
    connect(userId: string, userRole: string, token?: string): void {
        if (this.socket?.connected) {
            console.log('Already connected to WebSocket');
            return;
        }

        this.socket = io('http://localhost:3002', {
            transports: ['websocket'],
            auth: {
                token: token || undefined
            },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            this.connected = true;

            // Identify user
            this.socket?.emit('identify', { id: userId, role: userRole });
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            this.connected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            this.notifyListeners('connection-error', { message: 'Failed to connect to real-time server.' });
        });

        this.socket.on('reconnect_failed', () => {
            console.error('WebSocket reconnection failed after all attempts');
            this.connected = false;
            this.notifyListeners('connection-error', { message: 'Lost connection to real-time server. Please refresh the page.' });
        });

        this.socket.on('reconnect_attempt', (attempt: number) => {
            console.log(`WebSocket reconnection attempt ${attempt}`);
        });

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for all message types
     */
    private setupEventListeners(): void {
        if (!this.socket) return;

        // Attendance events
        this.socket.on('attendance-changed', (data) => {
            this.notifyListeners('attendance-changed', data);
        });

        // Performance events
        this.socket.on('performance-changed', (data) => {
            this.notifyListeners('performance-changed', data);
        });

        // Quiz events
        this.socket.on('quiz-submission', (data) => {
            this.notifyListeners('quiz-submission', data);
        });

        // Session events
        this.socket.on('session-changed', (data) => {
            this.notifyListeners('session-changed', data);
        });

        this.socket.on('session-ended', (data) => {
            this.notifyListeners('session-ended', data);
        });

        // Blockchain events
        this.socket.on('blockchain-update', (data) => {
            this.notifyListeners('blockchain-update', data);
        });

        // Digital twin events
        this.socket.on('digital-twin-changed', (data) => {
            this.notifyListeners('digital-twin-changed', data);
        });

        // Engagement events
        this.socket.on('engagement-update', (data) => {
            this.notifyListeners('engagement-update', data);
        });

        // Chat events
        this.socket.on('new-chat-message', (data) => {
            this.notifyListeners('new-chat-message', data);
        });
    }

    /**
     * Notify all listeners for a specific event
     */
    private notifyListeners(event: string, data: any): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => callback(data));
        }
    }

    /**
     * Subscribe to an event
     */
    on(event: string, callback: (data: any) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        // Return unsubscribe function
        return () => {
            const eventListeners = this.listeners.get(event);
            if (eventListeners) {
                eventListeners.delete(callback);
            }
        };
    }

    /**
     * Emit an event to the server
     */
    emit(event: string, data: any): void {
        if (!this.socket?.connected) {
            console.warn('Cannot emit event: WebSocket not connected');
            return;
        }
        this.socket.emit(event, data);
    }

    /**
     * Send attendance update
     */
    sendAttendanceUpdate(data: any): void {
        this.emit('attendance-update', data);
    }

    /**
     * Send performance update
     */
    sendPerformanceUpdate(data: any): void {
        this.emit('performance-update', data);
    }

    /**
     * Send quiz submission
     */
    sendQuizSubmission(data: any): void {
        this.emit('quiz-submitted', data);
    }

    /**
     * Send session update
     */
    sendSessionUpdate(data: any): void {
        this.emit('session-update', data);
    }

    /**
     * Send blockchain transaction update
     */
    sendBlockchainUpdate(data: any): void {
        this.emit('blockchain-transaction', data);
    }

    /**
     * Send digital twin state update
     */
    sendDigitalTwinUpdate(data: any): void {
        this.emit('digital-twin-update', data);
    }

    /**
     * Send engagement metric
     */
    sendEngagementMetric(data: any): void {
        this.emit('engagement-metric', data);
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Disconnect from server
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
            this.listeners.clear();
        }
    }
}

// Singleton instance
export const websocketService = new WebSocketService();
