import React, { useEffect, useState } from 'react';
import Spinner from './Spinner';
import {
  fetchTickets,
  fetchUnassignedTickets,
  createTicket,
  replyToTicket,
  assignTicket,
  closeTicket,
} from '../services/dataService';

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority?: 'low' | 'medium' | 'high';
  assignedToId?: string | null;
  replies?: { message: string; userName?: string; createdAt?: number }[];
};

interface TicketPanelProps {
  userId: string;
  role: 'student' | 'teacher' | 'admin';
  colors: { primary: string; hover: string; lightBg?: string; text?: string };
}

const TicketPanel: React.FC<TicketPanelProps> = ({ userId, role, colors }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [unassigned, setUnassigned] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  const isAdmin = role === 'admin';

  const load = async () => {
    setLoading(true);
    try {
      const ts = await fetchTickets();
      setTickets(ts);
      if (isAdmin) {
        const ua = await fetchUnassignedTickets();
        setUnassigned(ua);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    try {
      await createTicket({ subject, message, priority });
      setSubject('');
      setMessage('');
      await load();
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (id: string) => {
    const text = prompt('Reply message');
    if (!text) return;
    setLoading(true);
    try {
      await replyToTicket(id, { message: text });
      await load();
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (id: string) => {
    setLoading(true);
    try {
      await assignTicket(id, userId);
      await load();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id: string) => {
    setLoading(true);
    try {
      await closeTicket(id);
      await load();
    } finally {
      setLoading(false);
    }
  };

  const PriorityBadge = ({ p }: { p?: string }) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      p === 'high' ? 'bg-red-100 text-red-700' :
      p === 'low' ? 'bg-green-100 text-green-700' :
      'bg-yellow-100 text-yellow-700'
    }`}>
      {p || 'medium'}
    </span>
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-700">Helpdesk Tickets</h2>
        {loading && <Spinner size="w-4 h-4" />}
      </div>

      {/* Create */}
      <div className="grid gap-2 mb-4">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full p-2 border border-gray-300 rounded"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe the issue"
          rows={3}
          className="w-full p-2 border border-gray-300 rounded"
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="p-2 border border-gray-300 rounded"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button
            onClick={handleCreate}
            className={`ml-auto text-white px-4 py-2 rounded ${colors.primary} ${colors.hover}`}
            disabled={loading}
          >
            Submit Ticket
          </button>
        </div>
      </div>

      {/* Unassigned for admin */}
      {isAdmin && unassigned.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Unassigned</h3>
          <div className="space-y-2">
            {unassigned.map(t => (
              <div key={t.id} className="border rounded p-2 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm text-gray-800">{t.subject} <PriorityBadge p={t.priority} /></div>
                  <div className="text-xs text-gray-600">{t.message}</div>
                </div>
                <button onClick={() => handleAssign(t.id)} className="text-xs text-white px-2 py-1 rounded bg-blue-600 hover:bg-blue-700" disabled={loading}>Assign to me</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My tickets (student/teacher) or all tickets (admin) */}
      <div className="space-y-3">
        {tickets.map(t => (
          <div key={t.id} className="border rounded p-3">
            <div className="flex justify-between items-center">
              <div className="font-semibold text-gray-800 text-sm">{t.subject}</div>
              <div className="flex gap-2 items-center">
                <PriorityBadge p={t.priority} />
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{t.status}</span>
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-1">{t.message}</p>
            {t.assignedToId && <p className="text-xs text-gray-500 mt-1">Assigned to: {t.assignedToId}</p>}
            {t.replies && t.replies.length > 0 && (
              <div className="mt-2 space-y-1">
                {t.replies.map((r, idx) => (
                  <div key={idx} className="text-xs text-gray-600 border-l pl-2">
                    <span className="font-semibold">{r.userName || 'Admin'}:</span> {r.message}
                  </div>
                ))}
              </div>
            )}
            {isAdmin && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleReply(t.id)} className="text-xs text-white px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700" disabled={loading}>Reply</button>
                {t.status !== 'closed' && (
                  <>
                    <button onClick={() => handleAssign(t.id)} className="text-xs text-white px-3 py-1 rounded bg-blue-600 hover:bg-blue-700" disabled={loading}>Assign to me</button>
                    <button onClick={() => handleClose(t.id)} className="text-xs text-white px-3 py-1 rounded bg-red-600 hover:bg-red-700" disabled={loading}>Close</button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        {tickets.length === 0 && <div className="text-sm text-gray-500">No tickets yet.</div>}
      </div>
    </div>
  );
};

export default TicketPanel;
