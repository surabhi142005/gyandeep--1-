/**
 * services/websocketService.ts
 *
 * Wrapper around realtimeClient.ts for backward compatibility.
 * Delegates to WebSocket-based realtimeClient.
 */

import { realtimeClient } from './realtimeClient';

class WebSocketServiceWrapper {
    connect(userId: string, userRole: string): void {
        realtimeClient.connect(userId, userRole);
    }

    on(event: string, callback: (data: any) => void): () => void {
        return realtimeClient.on(event, callback);
    }

    emit(event: string, data: any): void {
        realtimeClient.send({ type: 'emit', event, data });
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

    sendDigitalTwinUpdate(data: any): void {
        this.emit('digital-twin-changed', data);
    }

    sendEngagementMetric(data: any): void {
        this.emit('engagement-update', data);
    }

    isConnected(): boolean {
        return realtimeClient.isConnected();
    }

    disconnect(): void {
        realtimeClient.disconnect();
    }
}

export const websocketService = new WebSocketServiceWrapper();
