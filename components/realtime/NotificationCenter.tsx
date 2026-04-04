import React, { useState, useEffect } from 'react';
import { useRealtime, RealtimeNotification } from '../../services/RealtimeProvider';
import { cn } from '../AuditLog/utils';
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  X, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  Trash2
} from 'lucide-react';

interface NotificationCenterProps {
  className?: string;
  maxHeight?: string;
}

export function NotificationCenter({ className, maxHeight = '400px' }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useRealtime();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-center')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const getIcon = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className={cn('relative notification-center', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        ) : (
          <BellOff className="w-5 h-5 text-gray-400" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  filter === 'unread' 
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {filter === 'all' ? 'All' : 'Unread'}
              </button>
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearNotifications}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                    title="Clear all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div 
            className="overflow-y-auto ios-overflow-scroll"
            style={{ maxHeight }}
          >
            {filteredNotifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <BellOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    'flex gap-3 p-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                    !notification.read && 'bg-indigo-50/50 dark:bg-indigo-900/10'
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {getTimeAgo(notification.timestamp)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ToastNotificationProps {
  notification: RealtimeNotification;
  onDismiss: () => void;
  autoDismiss?: number;
}

export function ToastNotification({ notification, onDismiss, autoDismiss = 5000 }: ToastNotificationProps) {
  useEffect(() => {
    if (autoDismiss > 0) {
      const timer = setTimeout(onDismiss, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onDismiss]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-slide-in',
        bgColors[notification.type]
      )}
    >
      <div className="flex-shrink-0">{icons[notification.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white">{notification.title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">{notification.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}

interface NotificationToastListProps {
  maxDisplay?: number;
  className?: string;
}

export function NotificationToastList({ maxDisplay = 3, className }: NotificationToastListProps) {
  const { notifications, markAsRead } = useRealtime();
  
  const unreadNotifications = notifications.filter(n => !n.read).slice(0, maxDisplay);

  if (unreadNotifications.length === 0) {
    return null;
  }

  return (
    <div className={cn('fixed top-20 right-4 z-50 flex flex-col gap-2', className)}>
      {unreadNotifications.map((notification) => (
        <ToastNotification
          key={notification.id}
          notification={notification}
          onDismiss={() => markAsRead(notification.id)}
        />
      ))}
    </div>
  );
}

export default NotificationCenter;
