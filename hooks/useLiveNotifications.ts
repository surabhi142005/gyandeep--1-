/**
 * hooks/useLiveNotifications.ts
 * Real-time notifications via WebSocket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeClient } from '../services/realtimeClient';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'attendance' | 'quiz' | 'system' | 'announcement' | 'grade';
  relatedId?: string;
  relatedType?: string;
  timestamp: string;
  read: boolean;
}

interface UseLiveNotificationsOptions {
  userId?: string;
  maxNotifications?: number;
}

export function useLiveNotifications({
  userId,
  maxNotifications = 50,
}: UseLiveNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const notificationsRef = useRef(notifications);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Check notification permission
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: Notification) => {
    if (permission !== 'granted') return;
    
    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
      });

      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
        
        // Mark as read and navigate
        markAsRead(notification.id);
        if (notification.relatedType === 'session') {
          window.location.href = `/dashboard?session=${notification.relatedId}`;
        }
      };

      // Auto close after 5 seconds
      setTimeout(() => browserNotification.close(), 5000);
    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  }, [permission]);

  // Fetch initial notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const formatted: Notification[] = data.map((n: any) => ({
          id: n.id || n._id?.toString(),
          title: n.title,
          message: n.message,
          type: n.type || 'system',
          relatedId: n.relatedId,
          relatedType: n.relatedType,
          timestamp: n.createdAt,
          read: n.read || false,
        }));

        setNotifications(formatted);
        setUnreadCount(formatted.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await Promise.all(
        notifications
          .filter(n => !n.read)
          .map(n =>
            fetch(`/api/notifications/${n.id}/read`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              },
            })
          )
      );

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [notifications]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      setNotifications(prev => {
        const updated = prev.filter(n => n.id !== notificationId);
        return updated;
      });
      
      const notification = notificationsRef.current.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // WebSocket listener for real-time notifications
  useEffect(() => {
    if (!userId) return;

    // Join user-specific room
    const room = `user:${userId}`;
    realtimeClient.joinRoom(room);

    const unsubNotification = realtimeClient.on('notification', (data: any) => {
      console.log('[LiveNotifications] Received notification:', data);

      const newNotification: Notification = {
        id: data.id || `temp-${Date.now()}`,
        title: data.title || 'Notification',
        message: data.message || '',
        type: data.type || 'system',
        relatedId: data.relatedId,
        relatedType: data.relatedType,
        timestamp: data.timestamp || new Date().toISOString(),
        read: false,
      };

      // Add to beginning of list
      setNotifications(prev => {
        const updated = [newNotification, ...prev].slice(0, maxNotifications);
        return updated;
      });

      // Increment unread count
      setUnreadCount(prev => prev + 1);

      // Show browser notification
      showBrowserNotification(newNotification);
    });

    // Initial fetch
    fetchNotifications();

    return () => {
      unsubNotification();
      realtimeClient.leaveRoom(room);
    };
  }, [userId, maxNotifications, fetchNotifications, showBrowserNotification]);

  // Auto-refresh notifications every 30 seconds as fallback
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    permission,
    requestPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refresh: fetchNotifications,
  };
}
