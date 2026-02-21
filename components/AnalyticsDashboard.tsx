import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getAnalyticsInsights } from '../services/dataService';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsDashboardProps {
  students: Array<{
    id: string;
    name: string;
    performance: Array<{ subject: string; date: string; score: number }>;
    xp?: number;
    badges?: string[];
    classId?: string;
  }>;
  attendance: Array<{
    studentId: string;
    studentName: string;
    status: 'Present' | 'Absent';
    timestamp: Date | null;
  }>;
  subjects: Array<{ id: string; name: string }>;
  currentUserRole: 'teacher' | 'admin';
  theme: string;
}

interface AtRiskStudent {
  id: string;
  name: string;
  avgScore: number;
  attendanceRate: number;
  trend: 'declining' | 'stable' | 'improving';
  riskLevel: 'high' | 'medium' | 'low';
}

// ─── Theme Maps ──────────────────────────────────────────────────────────────

const THEME_COLORS: Record<string, Record<string, string>> = {
  indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500', border: 'border-indigo-500', lightBg: 'bg-indigo-50' },
  teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500', border: 'border-teal-500', lightBg: 'bg-teal-50' },
  crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500', border: 'border-red-500', lightBg: 'bg-red-50' },
  purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500', border: 'border-purple-500', lightBg: 'bg-purple-50' },
};

const THEME_HEX: Record<string, string> = {
  indigo: '#4f46e5',
  teal: '#0d9488',
  crimson: '#dc2626',
  purple: '#9333ea',
};

const PIE_PALETTE = ['#4f46e5', '#0d9488', '#dc2626', '#9333ea', '#f59e0b', '#10b981', '#ec4899', '#6366f1'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (d: string) => {
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  return d;
};

const toDateKey = (ts: Date | null): string => {
  if (!ts) return 'unknown';
  const d = new Date(ts);
  return d.toISOString().slice(0, 10);
};

// ─── Component ───────────────────────────────────────────────────────────────

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  students,
  attendance,
  subjects,
  currentUserRole,
  theme,
}) => {
  // State
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);

  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);
  const hex = useMemo(() => THEME_HEX[theme] || THEME_HEX.indigo, [theme]);

  // ─── Filtered Performance Data ───────────────────────────────────────────

  const filteredPerformance = useMemo(() => {
    const all: Array<{ studentId: string; subject: string; date: string; score: number }> = [];
    students.forEach((s) => {
      s.performance.forEach((p) => {
        all.push({ studentId: s.id, subject: p.subject, date: p.date, score: p.score });
      });
    });
    return all.filter((p) => {
      if (selectedSubject !== 'All' && p.subject !== selectedSubject) return false;
      if (dateFrom && p.date < dateFrom) return false;
      if (dateTo && p.date > dateTo) return false;
      return true;
    });
  }, [students, selectedSubject, dateFrom, dateTo]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((a) => {
      const key = toDateKey(a.timestamp);
      if (dateFrom && key < dateFrom) return false;
      if (dateTo && key > dateTo) return false;
      return true;
    });
  }, [attendance, dateFrom, dateTo]);

  // ─── Summary Cards ──────────────────────────────────────────────────────

  const totalStudents = students.length;

  const avgPerformance = useMemo(() => {
    if (filteredPerformance.length === 0) return 0;
    const sum = filteredPerformance.reduce((acc, p) => acc + p.score, 0);
    return Math.round(sum / filteredPerformance.length);
  }, [filteredPerformance]);

  const attendanceRate = useMemo(() => {
    if (filteredAttendance.length === 0) return 0;
    const present = filteredAttendance.filter((a) => a.status === 'Present').length;
    return Math.round((present / filteredAttendance.length) * 100);
  }, [filteredAttendance]);

  // ─── At-Risk Students ───────────────────────────────────────────────────

  const atRiskStudents = useMemo<AtRiskStudent[]>(() => {
    return students
      .map((s) => {
        const perfRecords = s.performance.filter((p) => {
          if (selectedSubject !== 'All' && p.subject !== selectedSubject) return false;
          if (dateFrom && p.date < dateFrom) return false;
          if (dateTo && p.date > dateTo) return false;
          return true;
        });

        const avgScore =
          perfRecords.length > 0
            ? Math.round(perfRecords.reduce((sum, p) => sum + p.score, 0) / perfRecords.length)
            : 0;

        // Determine trend from the last 5 records
        const sorted = [...perfRecords].sort((a, b) => a.date.localeCompare(b.date));
        let trend: 'declining' | 'stable' | 'improving' = 'stable';
        if (sorted.length >= 2) {
          const half = Math.floor(sorted.length / 2);
          const firstHalf = sorted.slice(0, half);
          const secondHalf = sorted.slice(half);
          const avgFirst = firstHalf.reduce((s, p) => s + p.score, 0) / firstHalf.length;
          const avgSecond = secondHalf.reduce((s, p) => s + p.score, 0) / secondHalf.length;
          if (avgSecond < avgFirst - 5) trend = 'declining';
          else if (avgSecond > avgFirst + 5) trend = 'improving';
        }

        // Attendance rate per student
        const studentAttendance = filteredAttendance.filter((a) => a.studentId === s.id);
        const studentAttRate =
          studentAttendance.length > 0
            ? (studentAttendance.filter((a) => a.status === 'Present').length /
                studentAttendance.length) *
              100
            : 100; // default to 100 if no records

        // Risk classification
        let riskLevel: 'high' | 'medium' | 'low' = 'low';
        if (avgScore < 40 || studentAttRate < 50 || trend === 'declining') {
          riskLevel = 'high';
        } else if (avgScore < 60 || studentAttRate < 75) {
          riskLevel = 'medium';
        }

        return {
          id: s.id,
          name: s.name,
          avgScore,
          attendanceRate: Math.round(studentAttRate),
          trend,
          riskLevel,
        };
      })
      .filter((s) => s.riskLevel === 'high' || s.riskLevel === 'medium')
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.riskLevel] - order[b.riskLevel];
      });
  }, [students, filteredAttendance, selectedSubject, dateFrom, dateTo]);

  // ─── Performance Trends (Line Chart Data) ──────────────────────────────

  const performanceTrendData = useMemo(() => {
    const dateMap: Record<string, Record<string, { total: number; count: number }>> = {};
    filteredPerformance.forEach((p) => {
      if (!dateMap[p.date]) dateMap[p.date] = {};
      if (!dateMap[p.date][p.subject]) dateMap[p.date][p.subject] = { total: 0, count: 0 };
      dateMap[p.date][p.subject].total += p.score;
      dateMap[p.date][p.subject].count += 1;
    });

    const dates = Object.keys(dateMap).sort();
    return dates.map((date) => {
      const entry: Record<string, string | number> = { date: formatDate(date) };
      Object.keys(dateMap[date]).forEach((subj) => {
        entry[subj] = Math.round(dateMap[date][subj].total / dateMap[date][subj].count);
      });
      return entry;
    });
  }, [filteredPerformance]);

  const trendSubjects = useMemo(() => {
    const set = new Set<string>();
    filteredPerformance.forEach((p) => set.add(p.subject));
    return Array.from(set);
  }, [filteredPerformance]);

  // ─── Attendance Chart Data (Bar) ────────────────────────────────────────

  const attendanceChartData = useMemo(() => {
    const dayMap: Record<string, { present: number; absent: number }> = {};
    filteredAttendance.forEach((a) => {
      const key = toDateKey(a.timestamp);
      if (!dayMap[key]) dayMap[key] = { present: 0, absent: 0 };
      if (a.status === 'Present') dayMap[key].present += 1;
      else dayMap[key].absent += 1;
    });
    return Object.keys(dayMap)
      .sort()
      .map((date) => ({
        date: formatDate(date),
        Present: dayMap[date].present,
        Absent: dayMap[date].absent,
      }));
  }, [filteredAttendance]);

  // ─── Subject Breakdown (Pie Chart Data) ─────────────────────────────────

  const subjectPieData = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filteredPerformance.forEach((p) => {
      if (!map[p.subject]) map[p.subject] = { total: 0, count: 0 };
      map[p.subject].total += p.score;
      map[p.subject].count += 1;
    });
    return Object.keys(map).map((subj) => ({
      name: subj,
      value: Math.round(map[subj].total / map[subj].count),
    }));
  }, [filteredPerformance]);

  // ─── AI Insights ────────────────────────────────────────────────────────

  const handleGetInsights = async () => {
    setAiLoading(true);
    setAiError(null);
    setShowInsightsPanel(true);
    try {
      const payload = {
        totalStudents,
        avgPerformance,
        attendanceRate,
        atRiskCount: atRiskStudents.length,
        subjectBreakdown: subjectPieData,
        atRiskStudents: atRiskStudents.slice(0, 10).map((s) => ({
          name: s.name,
          avgScore: s.avgScore,
          attendanceRate: s.attendanceRate,
          trend: s.trend,
          riskLevel: s.riskLevel,
        })),
      };
      const result = await getAnalyticsInsights(payload, 'dashboard');
      setAiInsights(result.insights || result.message || JSON.stringify(result));
    } catch (err: any) {
      setAiError(err.message || 'Failed to fetch AI insights.');
    } finally {
      setAiLoading(false);
    }
  };

  // ─── CSV Export ─────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const rows: string[][] = [
      ['Student ID', 'Student Name', 'Subject', 'Date', 'Score', 'Attendance Status'],
    ];

    students.forEach((s) => {
      s.performance.forEach((p) => {
        const attRecord = attendance.find(
          (a) => a.studentId === s.id && toDateKey(a.timestamp) === p.date
        );
        rows.push([
          s.id,
          s.name,
          p.subject,
          p.date,
          String(p.score),
          attRecord ? attRecord.status : 'N/A',
        ]);
      });
    });

    // Add students with attendance but no performance for those dates
    attendance.forEach((a) => {
      const studentPerf = students.find((s) => s.id === a.studentId);
      const dateKey = toDateKey(a.timestamp);
      const alreadyAdded = studentPerf?.performance.some((p) => p.date === dateKey);
      if (!alreadyAdded) {
        rows.push([a.studentId, a.studentName, 'N/A', dateKey, 'N/A', a.status]);
      }
    });

    const csv = rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─── Risk Badge Helper ─────────────────────────────────────────────────

  const riskBadge = (level: 'high' | 'medium' | 'low') => {
    const styles: Record<string, string> = {
      high: 'bg-red-100 text-red-800 border-red-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-green-100 text-green-800 border-green-300',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[level]}`}>
        {level.charAt(0).toUpperCase() + level.slice(1)} Risk
      </span>
    );
  };

  const trendIcon = (trend: 'declining' | 'stable' | 'improving') => {
    if (trend === 'declining') return <span className="text-red-500">&#9660;</span>;
    if (trend === 'improving') return <span className="text-green-500">&#9650;</span>;
    return <span className="text-gray-400">&#9654;</span>;
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            {currentUserRole === 'admin' ? 'Institution-wide' : 'Class'} performance overview
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGetInsights}
            disabled={aiLoading}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${colors.primary} ${colors.hover} ${colors.ring} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {aiLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              'AI Insights'
            )}
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent`}
            >
              <option value="All">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent`}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent`}
            />
          </div>
          {(selectedSubject !== 'All' || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSelectedSubject('All');
                setDateFrom('');
                setDateTo('');
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${colors.lightBg} rounded-xl p-5 border border-gray-100 shadow-sm`}>
          <p className="text-sm font-medium text-gray-500">Total Students</p>
          <p className={`text-3xl font-bold mt-1 ${colors.text}`}>{totalStudents}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Avg Performance</p>
          <p className="text-3xl font-bold mt-1 text-blue-600">{avgPerformance}%</p>
        </div>
        <div className="bg-green-50 rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{attendanceRate}%</p>
        </div>
        <div className="bg-red-50 rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">At-Risk Students</p>
          <p className="text-3xl font-bold mt-1 text-red-600">{atRiskStudents.length}</p>
        </div>
      </div>

      {/* AI Insights Panel */}
      {showInsightsPanel && (
        <div className={`rounded-xl border-2 ${colors.border} bg-white shadow-sm overflow-hidden`}>
          <div className={`px-5 py-3 ${colors.lightBg} flex items-center justify-between`}>
            <h3 className={`font-semibold ${colors.text}`}>AI-Generated Insights</h3>
            <button
              onClick={() => {
                setShowInsightsPanel(false);
                setAiInsights(null);
                setAiError(null);
              }}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              &times;
            </button>
          </div>
          <div className="p-5">
            {aiLoading && (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-8 w-8 mr-3" style={{ color: hex }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span className="text-gray-500 text-sm">Generating AI insights...</span>
              </div>
            )}
            {aiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {aiError}
              </div>
            )}
            {aiInsights && !aiLoading && (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {aiInsights}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts Row 1: Performance Trends + Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Trends</h3>
          {performanceTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                {trendSubjects.map((subj, idx) => (
                  <Line
                    key={subj}
                    type="monotone"
                    dataKey={subj}
                    stroke={PIE_PALETTE[idx % PIE_PALETTE.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
              No performance data available for the selected filters.
            </div>
          )}
        </div>

        {/* Attendance Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Overview</h3>
          {attendanceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
              No attendance data available for the selected filters.
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Subject Breakdown + At-Risk Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Breakdown Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Subject Breakdown</h3>
          {subjectPieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={subjectPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {subjectPieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_PALETTE[index % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Avg Score']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {subjectPieData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: PIE_PALETTE[idx % PIE_PALETTE.length] }}
                    ></span>
                    {entry.name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
              No subject data available for the selected filters.
            </div>
          )}
        </div>

        {/* At-Risk Students Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            At-Risk Students
            {atRiskStudents.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {atRiskStudents.length}
              </span>
            )}
          </h3>
          {atRiskStudents.length > 0 ? (
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {atRiskStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{student.name}</p>
                      {riskBadge(student.riskLevel)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        Avg: <strong className={student.avgScore < 40 ? 'text-red-600' : 'text-gray-700'}>{student.avgScore}%</strong>
                      </span>
                      <span>
                        Attendance: <strong className={student.attendanceRate < 60 ? 'text-red-600' : 'text-gray-700'}>{student.attendanceRate}%</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        Trend: {trendIcon(student.trend)} <span className="capitalize">{student.trend}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <svg className="w-12 h-12 mb-3 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No at-risk students detected.</p>
              <p className="text-xs mt-1">All students are performing within acceptable thresholds.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
