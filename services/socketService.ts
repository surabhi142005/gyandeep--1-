/**
 * services/socketService.ts
 * WebSocket client for bidirectional real-time communication
 */

import { getStoredToken } from './authService';

type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;

interface SocketMessage {
  type: string;
  [key: string]: any;
}

class SocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private connectionHandlers: Map<string, Set<ConnectionHandler>> = new Map();
  private messageQueue: SocketMessage[] = [];
  private connected: boolean = false;
  private subscribedEvents: Set<string> = new Set();
  private userId: string | null = null;
  private userRole: string | null = null;

  connect(userId?: string, userRole?: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.userId = userId || null;
    this.userRole = userRole || null;

    const token = getStoredToken();
    const wsUrl = new URL('/ws', window.location.origin.replace(/^http/, 'ws'));
    if (token && token !== 'cookie-auth') {
      wsUrl.searchParams.set('token', token);
    }

    this.url = wsUrl.toString();
    this.createConnection();
  }

  private createConnection() {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.startPing();
      this.flushMessageQueue();
      this.notifyConnectionHandlers('open');

      if (this.subscribedEvents.size > 0) {
        this.send({ type: 'subscribe', events: Array.from(this.subscribedEvents) });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message: SocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.connected = false;
      this.stopPing();
      this.notifyConnectionHandlers('close');

      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.notifyConnectionHandlers('error');
    };
  }

  private handleMessage(message: SocketMessage) {
    switch (message.type) {
      case 'connected':
        console.log('WebSocket authenticated:', message.clientId);
        break;

      case 'pong':
        break;

      case 'event':
        if (message.event) {
          this.notifyListeners(message.event, message.data);
        }
        break;

      case 'broadcast':
        this.notifyListeners('broadcast', message);
        break;

      case 'error':
        console.error('WebSocket server error:', message.message);
        break;
    }

    this.notifyListeners(message.type, message);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.notifyConnectionHandlers('failed');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.notifyConnectionHandlers('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.createConnection();
    }, delay);
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, 15000);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  send(message: SocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connected = false;
    this.listeners.clear();
    this.subscribedEvents.clear();
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

  onConnection(event: 'open' | 'close' | 'error' | 'reconnecting' | 'failed', handler: ConnectionHandler): () => void {
    if (!this.connectionHandlers.has(event)) {
      this.connectionHandlers.set(event, new Set());
    }
    this.connectionHandlers.get(event)!.add(handler);

    return () => {
      this.connectionHandlers.get(event)?.delete(handler);
    };
  }

  private notifyListeners(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket handler for ${event}:`, error);
        }
      });
    }
  }

  private notifyConnectionHandlers(event: string) {
    const handlers = this.connectionHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler();
        } catch (error) {
          console.error(`Error in WebSocket connection handler ${event}:`, error);
        }
      });
    }
  }

  subscribeToEvents(events: string[]) {
    events.forEach(event => this.subscribedEvents.add(event));
    if (this.isConnected) {
      this.send({ type: 'subscribe', events });
    }
  }

  unsubscribeFromEvents(events: string[]) {
    events.forEach(event => this.subscribedEvents.delete(event));
  }

  joinRoom(room: string) {
    this.send({ type: 'join', room });
  }

  leaveRoom(room: string) {
    this.send({ type: 'leave', room });
  }

  broadcast(room: string, data: any) {
    this.send({ type: 'broadcast', room, data });
  }

  emit(event: string, data: any) {
    this.send({ type: 'emit', event, data });
  }

  sendTyping(room: string, isTyping: boolean) {
    this.send({ type: 'typing', room, isTyping });
  }

  updatePresence(room: string, status: 'online' | 'away' | 'busy' | 'offline') {
    this.send({ type: 'presence', room, status });
  }

  isConnected(): boolean {
    return this.connected;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

export const socketService = new SocketService();
export default socketService;
