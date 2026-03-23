export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export function getEventTypeColor(type: string): string {
  const colors: Record<string, string> = {
    LOGIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    LOGOUT: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    QUIZ_SUBMITTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    ATTENDANCE_MARKED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    GRADE_POSTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    NOTE_UPLOADED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    USER_CREATED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    USER_UPDATED: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    USER_DELETED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    SESSION_STARTED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    SESSION_ENDED: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
    ERROR: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
    WARNING: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    INFO: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };
  
  return colors[type] || colors.default;
}

export function getEventIcon(type: string): string {
  const icons: Record<string, string> = {
    LOGIN: '🔓',
    LOGOUT: '🔒',
    QUIZ_SUBMITTED: '📝',
    ATTENDANCE_MARKED: '✅',
    GRADE_POSTED: '📊',
    NOTE_UPLOADED: '📄',
    USER_CREATED: '👤',
    USER_UPDATED: '✏️',
    USER_DELETED: '🗑️',
    SESSION_STARTED: '▶️',
    SESSION_ENDED: '⏹️',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',
  };
  return icons[type] || '📋';
}

export function formatEventDetails(details: Record<string, unknown> | null): string {
  if (!details) return '';
  
  const entries = Object.entries(details);
  if (entries.length === 0) return '';
  
  return entries
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(', ');
}
