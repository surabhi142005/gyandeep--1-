import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeClient } from '../services/realtimeClient';

export interface UserPresence {
  userId: string;
  userName: string;
  role?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: string;
  room?: string;
}

export interface RoomInfo {
  room: string;
  count: number;
  users: UserPresence[];
}

export function usePresence(room?: string) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(new Map());
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const currentRoomRef = useRef<string | undefined>(room);

  useEffect(() => {
    if (room && room !== currentRoomRef.current) {
      if (currentRoomRef.current) {
        realtimeClient.leaveRoom(currentRoomRef.current);
      }
      realtimeClient.joinRoom(room);
      currentRoomRef.current = room;
    }

    const unsubConnect = realtimeClient.onConnect(() => {
      setIsConnected(true);
      if (room) {
        realtimeClient.joinRoom(room);
      }
    });

    const unsubDisconnect = realtimeClient.onDisconnect(() => {
      setIsConnected(false);
    });

    const unsubUserJoined = realtimeClient.on('user_joined', (data: { userId: string; userName: string; total?: number }) => {
      setOnlineUsers(prev => {
        const updated = new Map(prev);
        updated.set(data.userId, {
          userId: data.userId,
          userName: data.userName,
          status: 'online',
          room: currentRoomRef.current,
        });
        return updated;
      });
    });

    const unsubUserLeft = realtimeClient.on('user_left', (data: { userId: string }) => {
      setOnlineUsers(prev => {
        const updated = new Map(prev);
        const user = updated.get(data.userId);
        if (user) {
          updated.set(data.userId, { ...user, status: 'offline', lastSeen: new Date().toISOString() });
        }
        return updated;
      });
    });

    const unsubUserOffline = realtimeClient.on('user_offline', (data: { userId: string }) => {
      setOnlineUsers(prev => {
        const updated = new Map(prev);
        const user = updated.get(data.userId);
        if (user) {
          updated.set(data.userId, { ...user, status: 'offline', lastSeen: new Date().toISOString() });
        }
        return updated;
      });
    });

    const unsubRoomMembers = realtimeClient.on('room_members', (data: { room: string; users: any[]; count: number }) => {
      setRoomInfo({ room: data.room, count: data.count, users: data.users });
      setOnlineUsers(prev => {
        const updated = new Map(prev);
        data.users.forEach((u: any) => {
          updated.set(u.id, {
            userId: u.id,
            userName: u.name,
            role: u.role,
            status: 'online',
            room: data.room,
          });
        });
        return updated;
      });
    });

    const unsubTyping = realtimeClient.on('user_typing', (data: { userId: string; userName: string; isTyping: boolean; room?: string }) => {
      setTypingUsers(prev => {
        const updated = new Map(prev);
        const typingSet = updated.get(data.room || 'default') || new Set();
        if (data.isTyping) {
          typingSet.add(data.userName);
        } else {
          typingSet.delete(data.userName);
        }
        updated.set(data.room || 'default', typingSet);
        return updated;
      });
    });

    const unsubJoined = realtimeClient.on('joined', (data: { room: string }) => {
      currentRoomRef.current = data.room;
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubUserJoined();
      unsubUserLeft();
      unsubUserOffline();
      unsubRoomMembers();
      unsubTyping();
      unsubJoined();
      if (currentRoomRef.current) {
        realtimeClient.leaveRoom(currentRoomRef.current);
      }
    };
  }, [room]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (currentRoomRef.current) {
      realtimeClient.sendTyping(currentRoomRef.current, isTyping);
    }
  }, []);

  const updateStatus = useCallback((status: UserPresence['status']) => {
    if (currentRoomRef.current) {
      realtimeClient.updatePresence(currentRoomRef.current, status);
    }
  }, []);

  const getOnlineUsersList = useCallback(() => {
    return Array.from(onlineUsers.values()).filter(u => u.status === 'online');
  }, [onlineUsers]);

  const getTypingUsers = useCallback((roomName?: string) => {
    return Array.from(typingUsers.get(roomName || 'default') || []);
  }, [typingUsers]);

  const isUserOnline = useCallback((userId: string) => {
    const user = onlineUsers.get(userId);
    return user?.status === 'online';
  }, [onlineUsers]);

  return {
    onlineUsers: getOnlineUsersList(),
    totalOnline: onlineUsers.size,
    roomInfo,
    isConnected,
    typingUsers: getTypingUsers(),
    sendTyping,
    updateStatus,
    isUserOnline,
  };
}

export function useOnlineUsers() {
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    realtimeClient.connect(`user:${Date.now()}`, 'user');

    const unsubConnect = realtimeClient.onConnect(() => {
      realtimeClient.send({ type: 'get_online_users' });
    });

    const unsubOnlineList = realtimeClient.on('online_users_list', (data: { users: UserPresence[]; count: number }) => {
      setUsers(data.users);
      setCount(data.count);
    });

    const unsubUserJoined = realtimeClient.on('user_joined', (data: { userId: string; userName: string }) => {
      setUsers(prev => {
        const existing = prev.findIndex(u => u.userId === data.userId);
        if (existing >= 0) return prev;
        return [...prev, { userId: data.userId, userName: data.userName, status: 'online' as const }];
      });
      setCount(prev => prev + 1);
    });

    const unsubUserLeft = realtimeClient.on('user_left', (data: { userId: string }) => {
      setUsers(prev => prev.filter(u => u.userId !== data.userId));
      setCount(prev => Math.max(0, prev - 1));
    });

    return () => {
      unsubConnect();
      unsubOnlineList();
      unsubUserJoined();
      unsubUserLeft();
    };
  }, []);

  return { users, count };
}

export function useUserStatus(userId: string) {
  const [status, setStatus] = useState<UserPresence['status']>('offline');
  const [lastSeen, setLastSeen] = useState<string | undefined>();

  useEffect(() => {
    const unsubOnline = realtimeClient.on('user_joined', (data: { userId: string; userName: string }) => {
      if (data.userId === userId) {
        setStatus('online');
        setLastSeen(undefined);
      }
    });

    const unsubOffline = realtimeClient.on('user_offline', (data: { userId: string }) => {
      if (data.userId === userId) {
        setStatus('offline');
        setLastSeen(new Date().toISOString());
      }
    });

    const unsubPresence = realtimeClient.on('presence_update', (data: { userId: string; status: UserPresence['status'] }) => {
      if (data.userId === userId) {
        setStatus(data.status);
      }
    });

    return () => {
      unsubOnline();
      unsubOffline();
      unsubPresence();
    };
  }, [userId]);

  return { status, lastSeen };
}

export function useChatPresence(room: string, currentUserId: string) {
  const { onlineUsers, typingUsers, sendTyping, isUserOnline } = usePresence(room);

  useEffect(() => {
    if (room) {
      realtimeClient.updatePresence(room, 'online');
    }

    return () => {
      if (room) {
        realtimeClient.updatePresence(room, 'offline');
      }
    };
  }, [room]);

  return {
    onlineUsers,
    typingUsers,
    sendTyping,
    isUserOnline,
    isCurrentUserOnline: isUserOnline(currentUserId),
  };
}

export default usePresence;
