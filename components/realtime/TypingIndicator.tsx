import React, { useMemo } from 'react';
import { useRealtime } from '../../services/RealtimeProvider';
import { cn } from '../AuditLog/utils';
import { MessageCircle } from 'lucide-react';

interface TypingIndicatorProps {
  room: string;
  excludeUserId?: string;
  className?: string;
}

export function TypingIndicator({ room, excludeUserId, className }: TypingIndicatorProps) {
  const { typing, presence } = useRealtime();

  const typingUsers = useMemo(() => {
    const users: string[] = [];
    typing.forEach((isTyping, key) => {
      if (isTyping && key.startsWith(`${room}-`)) {
        const userId = key.replace(`${room}-`, '');
        if (userId !== excludeUserId) {
          const user = presence.get(userId);
          if (user) {
            users.push(user.name);
          }
        }
      }
    });
    return users;
  }, [typing, presence, room, excludeUserId]);

  if (typingUsers.length === 0) {
    return null;
  }

  const message =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing`
      : typingUsers.length === 2
      ? `${typingUsers[0]} and ${typingUsers[1]} are typing`
      : `${typingUsers.length} people are typing`;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg',
        className
      )}
    >
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>
    </div>
  );
}

interface SendTypingProps {
  room: string;
  isTyping: boolean;
}

export function useSendTyping(room: string) {
  const { sendTyping } = useRealtime();

  const startTyping = React.useCallback(() => {
    sendTyping(room, true);
  }, [room, sendTyping]);

  const stopTyping = React.useCallback(() => {
    sendTyping(room, false);
  }, [room, sendTyping]);

  return { startTyping, stopTyping };
}

interface ChatTypingIndicatorProps {
  room: string;
  excludeUserId?: string;
  className?: string;
}

export function ChatTypingIndicator({ room, excludeUserId, className }: ChatTypingIndicatorProps) {
  const { typing, presence } = useRealtime();
  const typingUsers = useMemo(() => {
    const users: string[] = [];
    
    typing.forEach((isTyping, key) => {
      if (isTyping && key.startsWith(`${room}-`)) {
        const userId = key.replace(`${room}-`, '');
        if (userId !== excludeUserId) {
          const user = presence.get(userId);
          if (user) {
            users.push(user.name);
          }
        }
      }
    });
    return users;
  }, [room, excludeUserId, typing, presence]);

  if (typingUsers.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg', className)}>
      <MessageCircle className="w-4 h-4 text-gray-400" />
      <span className="text-sm text-gray-500 dark:text-gray-400 italic">
        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
      </span>
    </div>
  );
}

export default TypingIndicator;
