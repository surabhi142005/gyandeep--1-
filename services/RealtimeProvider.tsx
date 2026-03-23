import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { realtimeClient } from './realtimeClient';
import { websocketService } from './websocketService';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: Date;
  typing?: boolean;
}

export interface RealtimeNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface RealtimeContextType {
  status: ConnectionStatus;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  retry: () => void;
  disconnect: () => void;
  
  subscribe: (event: string, callback: (data: any) => void) => () => void;
  emit: (event: string, data: any) => void;
  
  presence: Map<string, PresenceUser>;
  updatePresence: (room: string, status: PresenceUser['status']) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  
  typing: Map<string, boolean>;
  sendTyping: (room: string, isTyping: boolean) => void;
  
  notifications: RealtimeNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'read'>) => void;
  clearNotifications: () => void;
  
  broadcast: (room: string, event: string, data: any) => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

interface RealtimeProviderProps {
  children: ReactNode;
  userId?: string;
  userRole?: string;
}

export function RealtimeProvider({ children, userId, userRole }: RealtimeProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [presence, setPresence] = useState<Map<string, PresenceUser>>(new Map());
  const [typing, setTyping] = useState<Map<string, boolean>>(new Map());
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const currentUserRef = useRef<{ id?: string; role?: string }>({});

  useEffect(() => {
    if (userId && userRole) {
      currentUserRef.current = { id: userId, role: userRole };
    }
  }, [userId, userRole]);

  const addLocalNotification = useCallback((notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: RealtimeNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    if (!currentUserRef.current.id || !currentUserRef.current.role) {
      realtimeClient.disconnect();
      websocketService.disconnect();
      setStatus('disconnected');
      return;
    }

    const unsubStatus = realtimeClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'disconnected') {
        setReconnectAttempts((prev) => prev + 1);
      } else if (newStatus === 'connected') {
        setReconnectAttempts(0);
      }
    });

    const unsubConnect = realtimeClient.onConnect(() => {
      setStatus('connected');
      setReconnectAttempts(0);
      realtimeClient.send({ type: 'presence', status: 'online' });
    });

    const unsubDisconnect = realtimeClient.onDisconnect(() => {
      setStatus('disconnected');
    });

    const unsubError = realtimeClient.on('error', () => {
      console.error('Realtime error');
    });

    realtimeClient.connect(currentUserRef.current.id!, currentUserRef.current.role!);

    websocketService.connect(currentUserRef.current.id!, currentUserRef.current.role!);

    const unsubGradeUpdate = websocketService.on('grades-changed', (data) => {
      addLocalNotification({
        type: 'info',
        title: 'Grade Updated',
        message: `Your grade for ${data.subject || 'assignment'} has been posted`,
      });
    });

    const unsubAttendanceUpdate = websocketService.on('attendance-changed', () => {
      addLocalNotification({
        type: 'info',
        title: 'Attendance Updated',
        message: 'Your attendance record has been updated',
      });
    });

    const unsubAnnouncement = websocketService.on('announcement', (data) => {
      addLocalNotification({
        type: 'info',
        title: 'New Announcement',
        message: data.title || 'A new announcement has been posted',
      });
    });

    const unsubTicketUpdate = websocketService.on('ticket-update', (data) => {
      addLocalNotification({
        type: data.status === 'resolved' ? 'success' : 'info',
        title: `Ticket ${data.status === 'resolved' ? 'Resolved' : 'Updated'}`,
        message: data.message || 'A support ticket has been updated',
      });
    });

    const unsubUserJoined = realtimeClient.on('user_joined', (data) => {
      setPresence((prev) => {
        const next = new Map(prev);
        next.set(data.userId, {
          id: data.userId,
          name: data.name || 'User',
          status: 'online',
        });
        return next;
      });
    });

    const unsubUserLeft = realtimeClient.on('user_left', (data) => {
      setPresence((prev) => {
        const next = new Map(prev);
        const user = next.get(data.userId);
        if (user) {
          next.set(data.userId, { ...user, status: 'offline', lastSeen: new Date() });
        }
        return next;
      });
    });

    const unsubTyping = realtimeClient.on('user_typing', (data) => {
      const key = `${data.room}-${data.userId}`;
      setTyping((prev) => {
        const next = new Map(prev);
        next.set(key, data.isTyping);
        return next;
      });

      if (data.isTyping) {
        const existing = typingTimeouts.current.get(key);
        if (existing) clearTimeout(existing);
        const timeout = setTimeout(() => {
          setTyping((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        }, 3000);
        typingTimeouts.current.set(key, timeout);
      }
    });

    return () => {
      unsubStatus();
      unsubConnect();
      unsubDisconnect();
      unsubError();
      unsubGradeUpdate();
      unsubAttendanceUpdate();
      unsubAnnouncement();
      unsubTicketUpdate();
      unsubUserJoined();
      unsubUserLeft();
      unsubTyping();
      typingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, [addLocalNotification]);

  const retry = useCallback(() => {
    if (currentUserRef.current.id && currentUserRef.current.role) {
      realtimeClient.disconnect();
      setTimeout(() => {
        realtimeClient.connect(currentUserRef.current.id!, currentUserRef.current.role!);
      }, 100);
    }
  }, []);

  const disconnect = useCallback(() => {
    realtimeClient.disconnect();
    websocketService.disconnect();
  }, []);

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    const unsubRealtime = realtimeClient.on(event, callback);
    const unsubWS = websocketService.on(event, callback);
    return () => {
      unsubRealtime();
      unsubWS();
    };
  }, []);

  const emit = useCallback((event: string, data: any) => {
    websocketService.emit(event, data);
  }, []);

  const updatePresence = useCallback((room: string, userStatus: PresenceUser['status']) => {
    realtimeClient.updatePresence(room, userStatus);
  }, []);

  const joinRoom = useCallback((room: string) => {
    realtimeClient.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    realtimeClient.leaveRoom(room);
  }, []);

  const sendTyping = useCallback((room: string, isTyping: boolean) => {
    realtimeClient.sendTyping(room, isTyping);
  }, []);

  const broadcast = useCallback((room: string, event: string, data: any) => {
    realtimeClient.broadcast(room, { event, ...data });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: RealtimeContextType = {
    status,
    reconnectAttempts,
    maxReconnectAttempts: 5,
    retry,
    disconnect,
    subscribe,
    emit,
    presence,
    updatePresence,
    joinRoom,
    leaveRoom,
    typing,
    sendTyping,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification: addLocalNotification,
    clearNotifications,
    broadcast,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export default RealtimeProvider;
