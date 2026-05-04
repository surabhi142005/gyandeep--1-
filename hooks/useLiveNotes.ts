/**
 * hooks/useLiveNotes.ts
 * Real-time updates for notes
 */

import { useState, useEffect, useCallback } from 'react';
import { realtimeClient } from '../services/realtimeClient';

interface LiveNote {
  id: string;
  title: string;
  url: string;
  subjectId: string;
  uploadedBy: string;
  createdAt: string;
}

export function useLiveNotes(classId?: string, sessionId?: string, onNewNote?: (note: LiveNote) => void) {
  const [newNotes, setNewNotes] = useState<LiveNote[]>([]);

  useEffect(() => {
    if (!classId && !sessionId) return;

    const rooms = [];
    if (classId) rooms.push(`class:${classId}`);
    if (sessionId) rooms.push(`session:${sessionId}`);

    rooms.forEach(room => realtimeClient.joinRoom(room));

    const unsub = realtimeClient.on('note_uploaded', (data: LiveNote) => {
      setNewNotes(prev => [data, ...prev]);
      if (onNewNote) onNewNote(data);
    });

    const unsubCentralized = realtimeClient.on('centralized_note_uploaded', (data: any) => {
      // Handle centralized notes if needed
      console.log('Centralized note uploaded:', data);
    });

    return () => {
      unsub();
      unsubCentralized();
      rooms.forEach(room => realtimeClient.leaveRoom(room));
    };
  }, [classId, sessionId]);

  const clearNewNotes = useCallback(() => {
    setNewNotes([]);
  }, []);

  return {
    newNotes,
    clearNewNotes,
  };
}
