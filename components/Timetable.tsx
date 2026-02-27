import React, { useState, useEffect, useMemo } from 'react';
import { fetchTimetable, addTimetableEntry, deleteTimetableEntry } from '../services/dataService';
import { websocketService } from '../services/websocketService';

// --- Types ---

interface TimetableEntry {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId?: string;
  classId?: string;
  room?: string;
}

interface TimetableProps {
  currentUserRole: 'teacher' | 'student' | 'admin';
  currentUserId: string;
  subjects: Array<{ id: string; name: string }>;
  teachers?: Array<{ id: string; name: string }>;
  classes?: Array<{ id: string; name: string }>;
  classId?: string;
  theme: string;
}

// --- Theme Colors ---

const THEME_COLORS: Record<string, Record<string, string>> = {
  indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500', border: 'border-indigo-500', lightBg: 'bg-indigo-50' },
  teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500', border: 'border-teal-500', lightBg: 'bg-teal-50' },
  crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500', border: 'border-red-500', lightBg: 'bg-red-50' },
  purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500', border: 'border-purple-500', lightBg: 'bg-purple-50' },
};

// --- Constants ---

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 15; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
  if (h < 15) TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:30`);
}

const SUBJECT_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
  { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
  { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
  { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800' },
  { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-800' },
  { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-800' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-800' },
  { bg: 'bg-violet-100', border: 'border-violet-400', text: 'text-violet-800' },
];

const formatTime12 = (t: string) => {
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${suffix}`;
};

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const getCurrentDayName = (): string => {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return names[new Date().getDay()];
};

// --- Empty Form State ---

const emptyForm = {
  day: 'Monday',
  startTime: '08:00',
  endTime: '09:00',
  subject: '',
  teacherId: '',
  classId: '',
  room: '',
};

// --- Component ---

const Timetable: React.FC<TimetableProps> = ({
  currentUserRole,
  currentUserId,
  subjects,
  teachers = [],
  classes = [],
  classId,
  theme,
}) => {
  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);
  const canEdit = currentUserRole === 'admin' || currentUserRole === 'teacher';
  const currentDay = getCurrentDayName();

  // State
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>('Never');

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load timetable data
  const loadTimetable = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTimetable();
      setEntries(Array.isArray(data) ? data : []);
      setLastSyncAt(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();

    const unsubscribe = websocketService.on('timetable-changed', () => {
      loadTimetable();
    });

    return () => unsubscribe();
  }, []);

  // Filter by classId if provided
  const filteredEntries = useMemo(() => {
    if (!classId) return entries;
    return entries.filter((e) => e.classId === classId);
  }, [entries, classId]);

  // Build a color map: subject name -> color index
  const subjectColorMap = useMemo(() => {
    const map: Record<string, typeof SUBJECT_COLORS[number]> = {};
    const uniqueSubjects = [...new Set(filteredEntries.map((e) => e.subject))];
    uniqueSubjects.forEach((s, i) => {
      map[s] = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
    });
    return map;
  }, [filteredEntries]);

  // Helper: find entries for a given day and time slot
  const getEntriesForSlot = (day: string, slotTime: string): TimetableEntry[] => {
    const slotMin = timeToMinutes(slotTime);
    return filteredEntries.filter((e) => {
      if (e.day !== day) return false;
      const start = timeToMinutes(e.startTime);
      const end = timeToMinutes(e.endTime);
      return slotMin >= start && slotMin < end;
    });
  };

  // Check if a slot is the start of an entry (for rendering the block once)
  const isEntryStart = (entry: TimetableEntry, slotTime: string): boolean => {
    return entry.startTime === slotTime;
  };

  // Calculate how many 30-min slots an entry spans
  const entrySlotSpan = (entry: TimetableEntry): number => {
    const diff = timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime);
    return Math.max(1, Math.round(diff / 30));
  };

  // Resolve names
  const getTeacherName = (id?: string) => {
    if (!id) return '';
    return teachers.find((t) => t.id === id)?.name || id;
  };

  const getClassName = (id?: string) => {
    if (!id) return '';
    return classes.find((c) => c.id === id)?.name || id;
  };

  // Form handlers
  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddEntry = async () => {
    if (!form.subject) {
      setError('Please select a subject.');
      return;
    }
    if (timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) {
      setError('End time must be after start time.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await addTimetableEntry({
        day: form.day,
        startTime: form.startTime,
        endTime: form.endTime,
        subject: form.subject,
        teacherId: form.teacherId || undefined,
        classId: form.classId || undefined,
        room: form.room || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      await loadTimetable();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this timetable entry?')) return;
    try {
      setDeletingId(id);
      setError(null);
      await deleteTimetableEntry(id);
      await loadTimetable();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setDeletingId(null);
    }
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto mb-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-gray-500 text-sm">Loading timetable...</p>
        </div>
      </div>
    );
  }

  // --- Render: Grid View (Desktop) ---
  const renderGrid = () => {
    // Track which cells are already covered by a multi-slot entry
    const rendered = new Set<string>();

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="w-20 p-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 bg-gray-50">
                Time
              </th>
              {DAYS.map((day, i) => {
                const isToday = day === currentDay;
                return (
                  <th
                    key={day}
                    className={`p-2 text-xs font-semibold uppercase tracking-wide border-b border-gray-200 ${
                      isToday ? `${colors.lightBg} ${colors.text} font-bold` : 'text-gray-500 bg-gray-50'
                    }`}
                  >
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{DAY_SHORT[i]}</span>
                    {isToday && (
                      <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-current align-middle" />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot) => (
              <tr key={slot} className="group">
                <td className="p-1.5 text-xs text-gray-400 font-mono border-r border-gray-100 bg-gray-50/50 whitespace-nowrap">
                  {formatTime12(slot)}
                </td>
                {DAYS.map((day) => {
                  const cellKey = `${day}-${slot}`;

                  // If this cell is covered by a spanning entry, skip
                  if (rendered.has(cellKey)) return null;

                  const slotEntries = getEntriesForSlot(day, slot);
                  const startEntries = slotEntries.filter((e) => isEntryStart(e, slot));
                  const isToday = day === currentDay;

                  // If an entry starts here, render it with rowSpan
                  if (startEntries.length > 0) {
                    const entry = startEntries[0]; // Take first if overlapping
                    const span = entrySlotSpan(entry);
                    const entryColor = subjectColorMap[entry.subject] || SUBJECT_COLORS[0];

                    // Mark cells as rendered
                    const startIdx = TIME_SLOTS.indexOf(slot);
                    for (let s = 1; s < span && startIdx + s < TIME_SLOTS.length; s++) {
                      rendered.add(`${day}-${TIME_SLOTS[startIdx + s]}`);
                    }

                    return (
                      <td
                        key={cellKey}
                        rowSpan={span}
                        className={`p-0 border border-gray-100 ${isToday ? 'bg-gray-50/30' : ''}`}
                      >
                        <div
                          className={`h-full m-0.5 p-2 rounded-lg border-l-4 ${entryColor.bg} ${entryColor.border} transition-shadow hover:shadow-md relative group/entry`}
                        >
                          <div className={`font-semibold text-sm leading-tight ${entryColor.text}`}>
                            {entry.subject}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatTime12(entry.startTime)} - {formatTime12(entry.endTime)}
                          </div>
                          {entry.room && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              Room {entry.room}
                            </div>
                          )}
                          {entry.teacherId && (
                            <div className="text-xs text-gray-400 truncate">
                              {getTeacherName(entry.teacherId)}
                            </div>
                          )}
                          {entry.classId && (
                            <div className="text-xs text-gray-400 truncate">
                              {getClassName(entry.classId)}
                            </div>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              disabled={deletingId === entry.id}
                              className="absolute top-1 right-1 opacity-0 group-hover/entry:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600"
                              title="Delete entry"
                            >
                              {deletingId === entry.id ? (
                                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                              ) : (
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  }

                  // Empty cell
                  return (
                    <td
                      key={cellKey}
                      className={`p-0 border border-gray-100 h-10 ${isToday ? 'bg-gray-50/30' : ''}`}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // --- Render: List View (Mobile) ---
  const renderList = () => {
    const entriesByDay: Record<string, TimetableEntry[]> = {};
    DAYS.forEach((d) => {
      entriesByDay[d] = filteredEntries
        .filter((e) => e.day === d)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    });

    return (
      <div className="space-y-4">
        {DAYS.map((day) => {
          const dayEntries = entriesByDay[day];
          const isToday = day === currentDay;

          return (
            <div key={day}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm ${
                  isToday ? `${colors.lightBg} ${colors.text}` : 'bg-gray-50 text-gray-700'
                }`}
              >
                {day}
                {isToday && (
                  <span className="text-xs font-normal px-1.5 py-0.5 rounded-full bg-white/70">Today</span>
                )}
              </div>

              {dayEntries.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-2">No classes scheduled</p>
              ) : (
                <div className="mt-1 space-y-1.5 px-1">
                  {dayEntries.map((entry) => {
                    const entryColor = subjectColorMap[entry.subject] || SUBJECT_COLORS[0];
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border-l-4 ${entryColor.bg} ${entryColor.border} relative`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold text-sm ${entryColor.text}`}>
                            {entry.subject}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTime12(entry.startTime)} - {formatTime12(entry.endTime)}
                            {entry.room && <span className="ml-2">Room {entry.room}</span>}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {entry.teacherId && getTeacherName(entry.teacherId)}
                            {entry.teacherId && entry.classId && ' | '}
                            {entry.classId && getClassName(entry.classId)}
                          </div>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            disabled={deletingId === entry.id}
                            className="shrink-0 p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                            title="Delete entry"
                          >
                            {deletingId === entry.id ? (
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // --- Render: Add Entry Form ---
  const renderForm = () => {
    if (!showForm) return null;

    const selectClass = `w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm ${colors.ring} focus:border-gray-400 focus:outline-none transition-colors bg-white`;

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Timetable Entry</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Day */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Day</label>
            <select
              value={form.day}
              onChange={(e) => handleFormChange('day', e.target.value)}
              className={selectClass}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
            <select
              value={form.startTime}
              onChange={(e) => handleFormChange('startTime', e.target.value)}
              className={selectClass}
            >
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{formatTime12(t)}</option>
              ))}
            </select>
          </div>

          {/* End Time */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
            <select
              value={form.endTime}
              onChange={(e) => handleFormChange('endTime', e.target.value)}
              className={selectClass}
            >
              {TIME_SLOTS.filter((t) => timeToMinutes(t) > timeToMinutes(form.startTime)).map((t) => (
                <option key={t} value={t}>{formatTime12(t)}</option>
              ))}
              <option value="16:00">{formatTime12('16:00')}</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
            <select
              value={form.subject}
              onChange={(e) => handleFormChange('subject', e.target.value)}
              className={selectClass}
            >
              <option value="">-- Select Subject --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Teacher */}
          {teachers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Teacher</label>
              <select
                value={form.teacherId}
                onChange={(e) => handleFormChange('teacherId', e.target.value)}
                className={selectClass}
              >
                <option value="">-- Optional --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Class */}
          {classes.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
              <select
                value={form.classId}
                onChange={(e) => handleFormChange('classId', e.target.value)}
                className={selectClass}
              >
                <option value="">-- Optional --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Room */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Room</label>
            <input
              type="text"
              value={form.room}
              onChange={(e) => handleFormChange('room', e.target.value)}
              placeholder="e.g. A-101"
              className={selectClass}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleAddEntry}
            disabled={submitting}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg ${colors.primary} ${colors.hover} ${colors.ring} focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Adding...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Entry
              </>
            )}
          </button>
          <button
            onClick={() => { setShowForm(false); setForm(emptyForm); }}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <svg className={`h-5 w-5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Weekly Timetable
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Last synced: {lastSyncAt} · Source: live server
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {classId ? `Filtered by class` : 'All classes'} &middot; {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg ${colors.primary} ${colors.hover} ${colors.ring} focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors shadow-sm`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Entry
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Add Form */}
      {canEdit && renderForm()}

      {/* Empty State */}
      {filteredEntries.length === 0 && !loading ? (
        <div className="text-center py-16">
          <svg className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 font-medium">No timetable entries yet</p>
          <p className="text-gray-400 text-sm mt-1">
            {canEdit ? 'Click "Add Entry" to create the first schedule.' : 'The timetable has not been set up yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Subject Legend */}
          {filteredEntries.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(subjectColorMap).map(([subject, sc]) => (
                <span
                  key={subject}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}
                >
                  <span className={`w-2 h-2 rounded-full ${sc.border} border-2`} />
                  {subject}
                </span>
              ))}
            </div>
          )}

          {/* Grid or List */}
          {isMobile ? renderList() : renderGrid()}
        </>
      )}
    </div>
  );
};

export default Timetable;
