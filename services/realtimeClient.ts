/**
 * services/realtimeClient.ts
 * Bidirectional WebSocket client for real-time communication
 */

import { getStoredToken } from './authService';

const API_BASE = import.meta.env.VITE_API_URL || '';
const WS_URL = API_BASE.replace(/^http/, 'ws') + '/ws';

type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;

interface RealtimeMessage {
  type: string;
  [key: string]: any;
}

class RealtimeClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private messageQueue: any[] = [];
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private onConnectHandlers: Set<ConnectionHandler> = new Set();
  private onDisconnectHandlers: Set<ConnectionHandler> = new Set();
  private onStatusChangeHandlers: Set<(status: 'connecting' | 'connected' | 'disconnected' | 'error') => void> = new Set();
  private _status: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private userId: string | null = null;
  private userRole: string | null = null;

  get status() {
    return this._status;
  }

  private setStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error') {
    this._status = status;
    this.onStatusChangeHandlers.forEach(handler => handler(status));
  }

  connect(userId: string, userRole: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    
    this.userId = userId;
    this.userRole = userRole;
    this.setStatus('connecting');

    const token = getStoredToken();
    if (!token) {
      console.warn('Cannot connect WebSocket: no auth token');
      this.setStatus('error');
      return;
    }

    try {
      this.ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
      this.startPing();
      this.onConnectHandlers.forEach(handler => handler());
    };

    this.ws.onmessage = (event) => {
      try {
        const message: RealtimeMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.setStatus('disconnected');
      this.stopPing();
      this.onDisconnectHandlers.forEach(handler => handler());
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.setStatus('error');
    };
  }

  private handleMessage(message: RealtimeMessage): void {
    const { type, ...data } = message;

    if (type === 'connected') {
      console.log('WebSocket handshake complete:', data);
    }

    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }

    const wildcardHandlers = this.listeners.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler(message));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (this.userId && this.userRole) {
        this.connect(this.userId, this.userRole);
      }
    }, delay);
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 15000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      this.sendImmediate(msg);
    }
  }

  private sendImmediate(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  send(message: any): void {
    const msg = typeof message === 'string' ? { type: message } : message;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendImmediate(msg);
    } else {
      this.messageQueue.push(msg);
    }
  }

  joinRoom(room: string): void {
    this.send({ type: 'join', room });
  }

  leaveRoom(room: string): void {
    this.send({ type: 'leave', room });
  }

  broadcast(room: string, data: any): void {
    this.send({ type: 'broadcast', room, data });
  }

  sendTyping(room: string, isTyping: boolean): void {
    this.send({ type: 'typing', room, isTyping });
  }

  updatePresence(room: string, status: 'online' | 'away' | 'busy' | 'offline'): void {
    this.send({ type: 'presence', room, status });
  }

  subscribe(events: string[]): void {
    this.send({ type: 'subscribe', events });
  }

  on(event: string, handler: MessageHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  off(event: string, handler: MessageHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.onConnectHandlers.add(handler);
    return () => this.onConnectHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.onDisconnectHandlers.add(handler);
    return () => this.onDisconnectHandlers.delete(handler);
  }

  onStatusChange(handler: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void): () => void {
    this.onStatusChangeHandlers.add(handler);
    return () => this.onStatusChangeHandlers.delete(handler);
  }

  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.messageQueue = [];
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this._status === 'connected';
  }
}

export const realtimeClient = new RealtimeClient();
export default realtimeClient;
