'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDateTime, formatRelativeTime, getEventTypeColor, getEventIcon, formatEventDetails, cn } from './utils';
import { Avatar } from '../LazyImage';
import { Skeleton } from '../ui/Skeletons';
import { 
  Activity, 
  Filter, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Download,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  User
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  odId: string;
  ts: string;
  type: string;
  userId?: string;
  user?: {
    name?: string;
    email?: string;
    role?: string;
  };
  details?: Record<string, unknown>;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 25;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

export default function AuditLogPanel() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const { data, isLoading, error, refetch } = useQuery<AuditLogResponse>({
    queryKey: ['auditLogs', selectedType, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedType !== 'all') params.set('type', selectedType);
      if (dateRange.start) params.set('startDate', dateRange.start);
      if (dateRange.end) params.set('endDate', dateRange.end);
      params.set('limit', String(PAGE_SIZE));
      params.set('page', String(currentPage));
      
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
  });

  const filteredLogs = useMemo(() => {
    if (!data?.logs) return [];
    if (!debouncedSearch.trim()) return data.logs;
    
    const search = debouncedSearch.toLowerCase();
    return data.logs.filter((log) => {
      const typeMatch = log.type.toLowerCase().includes(search);
      const userNameMatch = log.user?.name?.toLowerCase().includes(search);
      const emailMatch = log.user?.email?.toLowerCase().includes(search);
      return typeMatch || userNameMatch || emailMatch;
    });
  }, [data?.logs, debouncedSearch]);

  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.ceil(data.total / PAGE_SIZE);
  }, [data?.total]);

  const eventTypes = useMemo(() => {
    const types = new Set((data?.logs || []).map((log) => log.type));
    return Array.from(types).sort();
  }, [data?.logs]);

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (selectedType !== 'all') params.set('type', selectedType);
    params.set('format', 'csv');
    params.set('limit', '10000');
    
    const res = await fetch(`/api/admin/audit-logs/export?${params}`);
    if (!res.ok) return;
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  }, [currentPage]);

  const getEventIconComponent = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      LOGIN: <CheckCircle className="w-4 h-4 text-green-600" />,
      LOGOUT: <XCircle className="w-4 h-4 text-gray-600" />,
      QUIZ_SUBMITTED: <FileText className="w-4 h-4 text-blue-600" />,
      ATTENDANCE_MARKED: <CheckCircle className="w-4 h-4 text-purple-600" />,
      GRADE_POSTED: <FileText className="w-4 h-4 text-yellow-600" />,
      ERROR: <AlertTriangle className="w-4 h-4 text-red-600" />,
      WARNING: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      INFO: <Info className="w-4 h-4 text-sky-600" />,
    };
    return icons[type] || <Activity className="w-4 h-4 text-gray-600" />;
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Failed to load audit logs
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {error instanceof Error ? error.message : 'An unknown error occurred'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Audit Log
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by event type, user name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.start || ''}
              onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end || ''}
              onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getEventIconComponent(log.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        getEventTypeColor(log.type)
                      )}>
                        {getEventIcon(log.type)} {log.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeTime(log.ts)}
                      </span>
                    </div>
                    
                    {log.user && (
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar src={null} name={log.user.name || 'Unknown'} size="xs" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {log.user.name || 'Unknown User'}
                        </span>
                        {log.user.email && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({log.user.email})
                          </span>
                        )}
                        {log.user.role && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                            {log.user.role}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {formatEventDetails(log.details)}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDateTime(log.ts)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages}
            {data?.total && ` (${data.total} total)`}
          </p>
          
          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                      currentPage === pageNum
                        ? 'bg-indigo-600 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="px-1">...</span>
                  <button
                    onClick={() => goToPage(totalPages)}
                    className="w-8 h-8 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
