import React, { useMemo } from 'react';
import { useRealtime, PresenceUser } from '../../services/RealtimeProvider';
import { Avatar } from '../LazyImage';
import { cn } from '../AuditLog/utils';
import { Users, Circle } from 'lucide-react';

interface OnlineUsersProps {
  room?: string;
  maxDisplay?: number;
  showAvatar?: boolean;
  showNames?: boolean;
  className?: string;
}

export function OnlineUsers({
  maxDisplay = 5,
  showAvatar = true,
  showNames = true,
  className,
}: OnlineUsersProps) {
  const { presence } = useRealtime();

  const onlineUsers = useMemo(() => {
    const users = Array.from(presence.values()).filter(
      (u) => u.status === 'online' || u.status === 'away'
    );
    return users.slice(0, maxDisplay);
  }, [presence, maxDisplay]);

  const remainingCount = useMemo(() => {
    const total = Array.from(presence.values()).filter(
      (u) => u.status === 'online' || u.status === 'away'
    ).length;
    return Math.max(0, total - maxDisplay);
  }, [presence, maxDisplay]);

  if (onlineUsers.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-gray-500', className)}>
        <Users className="w-4 h-4" />
        <span>No users online</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showAvatar && (
        <div className="flex -space-x-2">
          {onlineUsers.map((user) => (
            <AvatarWithStatus
              key={user.id}
              user={user}
              size="sm"
            />
          ))}
          {remainingCount > 0 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
              +{remainingCount}
            </div>
          )}
        </div>
      )}
      {showNames && (
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {onlineUsers.length === 1
              ? '1 user online'
              : `${onlineUsers.length + remainingCount} users online`}
          </span>
        </div>
      )}
    </div>
  );
}

interface AvatarWithStatusProps {
  user: PresenceUser;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function AvatarWithStatus({ user, size = 'sm', className }: AvatarWithStatusProps) {
  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <div className={cn('relative', className)}>
      <Avatar
        src={user.avatar}
        name={user.name}
        size={size}
      />
      <span
        className={cn(
          'absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-gray-900',
          statusColors[user.status],
          dotSizes[size]
        )}
      />
    </div>
  );
}

interface UserPresenceIndicatorProps {
  userId: string;
  showName?: boolean;
  className?: string;
}

export function UserPresenceIndicator({ userId, showName = false, className }: UserPresenceIndicatorProps) {
  const { presence } = useRealtime();
  const user = presence.get(userId);

  if (!user) return null;

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  const statusLabels = {
    online: 'Online',
    away: 'Away',
    busy: 'Busy',
    offline: 'Offline',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Circle
        className={cn('w-2 h-2 fill-current', statusColors[user.status])}
      />
      {showName && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {user.name} • {statusLabels[user.status]}
        </span>
      )}
    </div>
  );
}

export default OnlineUsers;
