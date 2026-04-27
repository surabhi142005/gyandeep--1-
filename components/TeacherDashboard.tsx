import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, 
  UserCheck, 
  LineChart, 
  HelpCircle, 
  FileText, 
  Bell, 
  BarChart3, 
  XCircle,
  Clock,
  MapPin,
  Award,
  Download,
  RefreshCw,
  Zap
} from 'lucide-react';
import type { User, Student, AttendanceRecord } from '../types';
import { getCurrentPosition } from '../services/locationService';
import Spinner from './Spinner';
import PerformanceChart from './PerformanceChart';
import AttendanceChart from './AttendanceChart';
import WebcamCapture from './WebcamCapture';
import {
  fetchActiveSession,
  fetchAvailableQuizzes,
  fetchCentralizedNotesCombined,
  fetchQuizResults,
  fetchSessionAttendance,
  fetchTagPresets,
  fetchUsers,
  uploadClassNotes
} from '../services/dataService';
import { TeacherDashboardProps } from './TeacherDashboardProps';
import GradeBook from './GradeBook';
import TicketPanel from './TicketPanel';
import AnalyticsDashboard from './AnalyticsDashboard';
import { useTeacherSession } from '../hooks/useTeacherSession';
import { useQuizWorker } from '../hooks/useQuizWorker';
import { DashboardLayout, Card, Button, Badge, Input } from './ui';
import { fetchTeacherStats, fetchQuizStats, fetchWeeklyAttendance, fetchPerformanceBySubject } from '../services/dataService';
import { realtimeClient } from '../services/realtimeClient';
import { t } from '../services/i18n';
const SIDEBAR_ITEMS = [
  { id: 'session', label: t('Session Control'), icon: Play },
  { id: 'attendance', label: t('Attendance'), icon: UserCheck },
  { id: 'performance', label: t('Performance'), icon: LineChart },
  { id: 'quiz', label: t('Quiz Center'), icon: HelpCircle },
  { id: 'notes', label: t('Class Notes'), icon: FileText },
  { id: 'announcements', label: t('Board'), icon: Bell },
  { id: 'analytics', label: t('Analytics'), icon: BarChart3 },
  { id: 'tickets', label: t('Tickets'), icon: HelpCircle },
];

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
  teacher, students, attendance, classSession, onUpdateSession, 
  onLogout, theme, onUpdateFaceImage, historicalRecords, 
  onUpdateHistoricalRecords, allSubjects, allClasses, 
  announcements = [], onPostAnnouncement, onAttendanceUpdate, onStudentsUpdate 
}) => {
  const [activeTab, setActiveTab] = useState('session');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>(
    classSession.subject || (teacher.assignedSubjects.length > 0 ? allSubjects.find(s => s.id === teacher.assignedSubjects[0])?.name || '' : '')
  );
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [attendanceRadius, setAttendanceRadius] = useState(10);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { generateQuiz: generateQuizWorker, isGenerating: workerGenerating, progress: workerProgress, error: workerError } = useQuizWorker();
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizTopic, setQuizTopic] = useState('');
  const [generatedQuiz, setGeneratedQuiz] = useState<any[]>([]);
  const [quizQuestionCount, setQuizQuestionCount] = useState(10);
  const [isPublishingQuiz, setIsPublishingQuiz] = useState(false);
  const [quizThinkingMode, setQuizThinkingMode] = useState(false);
  const [weeklyAttendance, setWeeklyAttendance] = useState<{ date: string; present: number }[]>([]);
  const [justUpdatedStudentId, setJustUpdatedStudentId] = useState<string | null>(null);
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<string[]>([]);
  const [selectedPerformanceIds, setSelectedPerformanceIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Present' | 'Absent'>('All');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: 'studentName' | 'status'; direction: 'ascending' | 'descending' }>({ key: 'studentName', direction: 'ascending' });
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  
  const [teacherStats, setTeacherStats] = useState({ quizzesTaken: 0, avgScore: 0, totalStudents: 0, attendanceRate: 0 });
  const [quizStats, setQuizStats] = useState({ totalQuizzes: 0, avgScore: 0, totalAttempts: 0 });
  const [weeklyAttendanceData, setWeeklyAttendanceData] = useState<{ date: string; present: number }[]>([]);
  const [performanceData, setPerformanceData] = useState<{ subject: string; avgScore: number }[]>([]);
  const [liveAttendance, setLiveAttendance] = useState<Map<string, AttendanceRecord>>(new Map());
  
  // RT-1 & RT-6: Enhanced analytics loading with polling during active session
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [stats, quiz] = await Promise.all([
          fetchTeacherStats(teacher.id),
          fetchQuizStats(teacher.id),
        ]);
        setTeacherStats(stats || { quizzesTaken: 0, avgScore: 0, totalStudents: 0, attendanceRate: 0 });
        setQuizStats(quiz || { totalQuizzes: 0, avgScore: 0, totalAttempts: 0 });
      } catch (err) { console.error('Failed to load teacher stats:', err); }
    };
    loadAnalytics();
    
    // Poll during active session
    if (classSession.isActive) {
      const pollInterval = setInterval(loadAnalytics, 8000);
      return () => clearInterval(pollInterval);
    }
  }, [teacher.id, classSession.isActive]);
  
  useEffect(() => {
    if (classSession.classId) {
      fetchWeeklyAttendance(classSession.classId)
        .then(setWeeklyAttendanceData)
        .catch(err => console.error('Failed to load weekly attendance:', err));
      fetchPerformanceBySubject(classSession.classId)
        .then(setPerformanceData)
        .catch(err => console.error('Failed to load performance data:', err));
    }
  }, [classSession.classId]);

  const [tagPresets, setTagPresets] = useState<Record<string, string[]>>({});
  const [notesText, setNotesText] = useState(classSession.notes || '');
  const [notesTab, setNotesTab] = useState<'session' | 'centralized'>('session');
  const [centralizedNotes, setCentralizedNotes] = useState<any[]>([]);
  const [selectedQuizClass, setSelectedQuizClass] = useState<string>('');
  const [expiryWarning, setExpiryWarning] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('--:--');
  const [serverExpiryTime, setServerExpiryTime] = useState<number | null>(null);
  const [publishedQuizzes, setPublishedQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [quizResultsSummary, setQuizResultsSummary] = useState<any>(null);
  const [quizResultsRows, setQuizResultsRows] = useState<any[]>([]);
  
  // RT-1: Sync session with server every 10 seconds for accurate timer
  useEffect(() => {
    if (!classSession.isActive || !classSession.id || !teacher.id) return;
    
    const syncWithServer = async () => {
      try {
        const data = await fetchActiveSession(teacher.id);
        if (data.active && data.session) {
          if (data.session.expiry) {
            setServerExpiryTime(new Date(data.session.expiry).getTime());
          }
          if (data.session.remainingTime !== undefined) {
            setServerExpiryTime(Date.now() + data.session.remainingTime);
          }
        }
      } catch (err) {
        console.warn('Failed to sync session with server:', err);
      }
    };
    
    syncWithServer();
    const syncInterval = setInterval(syncWithServer, 10000);
    return () => clearInterval(syncInterval);
  }, [classSession.isActive, classSession.id, teacher.id]);
  
  useEffect(() => {
    if (!classSession.isActive || !classSession.id) {
      setTimeRemaining('--:--');
      return;
    }
    
    const updateTimer = () => {
      const now = Date.now();
      const expiryTime = serverExpiryTime || (classSession.expiry ? classSession.expiry : null);
      if (!expiryTime) {
        setTimeRemaining('--:--');
        return;
      }
      
      const remaining = expiryTime - now;
      if (remaining <= 0) {
        setTimeRemaining('00:00');
        setExpiryWarning('Session has expired!');
        return;
      }
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      
      // RT-1: Red warning at 2 minutes
      if (remaining <= 120000 && remaining > 114000) {
        setExpiryWarning('⚠️ Session expires in 2 minutes!');
      } else if (remaining < 300000 && remaining > 294000) {
        setExpiryWarning('Session expires in 5 minutes!');
      } else if (remaining > 120000) {
        setExpiryWarning(null);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [classSession.isActive, classSession.id, classSession.expiry, serverExpiryTime]);
  
  useEffect(() => { fetchTagPresets().then(setTagPresets).catch((err) => { console.error('Failed to load tag presets:', err); }) }, []);
  useEffect(() => setNotesText(classSession.notes || ''), [classSession.notes]);

  useEffect(() => {
    if (!classSession.classId) {
      setPublishedQuizzes([]);
      setSelectedQuizId('');
      return;
    }

    fetchAvailableQuizzes(classSession.classId)
      .then((data) => {
        const quizzes = Array.isArray(data?.quizzes) ? data.quizzes : [];
        setPublishedQuizzes(quizzes);
        setSelectedQuizId((current) => current || quizzes[0]?.id || '');
      })
      .catch((err) => {
        console.error('Failed to load published quizzes:', err);
        setPublishedQuizzes([]);
      });
  }, [classSession.classId, classSession.quizPublished]);

  useEffect(() => {
    if (!selectedQuizId) {
      setQuizResultsSummary(null);
      setQuizResultsRows([]);
      return;
    }

    fetchQuizResults(selectedQuizId)
      .then((data) => {
        setQuizResultsSummary(data?.summary || null);
        setQuizResultsRows(Array.isArray(data?.results) ? data.results : []);
      })
      .catch((err) => {
        console.error('Failed to load quiz results:', err);
        setQuizResultsSummary(null);
        setQuizResultsRows([]);
      });
  }, [selectedQuizId]);
  
  // RT-2: Real-time attendance updates with live table
  useEffect(() => {
    if (!classSession.id || !onAttendanceUpdate) return;
    
    const handleAttendanceChange = (data: any) => {
      console.log('Attendance changed:', data);
      const newAttendance: AttendanceRecord = {
        studentId: data.studentId,
        studentName: data.studentName || 'Student',
        timestamp: new Date(),
        status: data.status === 'present' || data.status === 'Present' ? 'Present' : 'Absent',
      };
      
      // RT-2: Update live attendance map
      setLiveAttendance(prev => {
        const next = new Map(prev);
        next.set(data.studentId, newAttendance);
        return next;
      });
      
      onAttendanceUpdate(newAttendance);
    };
    
    const unsubscribe = realtimeClient.on('attendance-changed', handleAttendanceChange);
    
    // Also subscribe to quiz submissions to update quiz stats
    const handleQuizSubmission = (data: any) => {
      console.log('Quiz submission:', data);
      // Refresh quiz stats
      fetchQuizStats(teacher.id).then(setQuizStats).catch(console.error);
    };
    
    const unsubQuiz = realtimeClient.on('quiz_submission', handleQuizSubmission);
    
    // Subscribe to XP updates to refresh students list (for leaderboard)
    const handleXpUpdate = (data: any) => {
      console.log('XP updated:', data);
      if (onStudentsUpdate) {
        // Trigger a students refresh if needed
        fetchUsers()
          .then((users) => {
            const studentsOnly = users.filter((u): u is Student => u.role === 'student');
            onStudentsUpdate(studentsOnly);
          })
          .catch(console.error);
      }
    };
    
    const unsubXp = realtimeClient.on('xp_updated', handleXpUpdate);
    
    return () => {
      unsubscribe();
      unsubQuiz();
      unsubXp();
    };
  }, [classSession.id, onAttendanceUpdate, onStudentsUpdate, teacher.id]);
  
  // Polling fallback for attendance updates (if SSE/WebSocket fails)
  useEffect(() => {
    if (!classSession.id || !onAttendanceUpdate) return;
    
    const pollAttendance = async () => {
      try {
        const data = await fetchSessionAttendance(classSession.id);
        if (Array.isArray(data)) {
          data.forEach((record: any) => {
            const newAttendance: AttendanceRecord = {
              studentId: record.studentId || record.student?._id,
              studentName: record.student?.name || 'Student',
              timestamp: new Date(record.markedAt),
              status: record.status === 'present' || record.status === 'Present' ? 'Present' : 'Absent',
            };
            onAttendanceUpdate(newAttendance);
          });
        }
      } catch (err) {
        console.warn('Failed to poll attendance:', err);
      }
    };
    
    // Poll every 5 seconds
    pollAttendance();
    const pollInterval = setInterval(pollAttendance, 5000);
    return () => clearInterval(pollInterval);
  }, [classSession.id, onAttendanceUpdate]);
  
  useEffect(() => {
    if (notesTab === 'centralized' && classSession.classId && classSession.subject) {
      fetchCentralizedNotesCombined({ subjectId: classSession.subject, classId: classSession.classId })
        .then(setCentralizedNotes)
        .catch(err => console.error('Failed to load centralized notes', err));
    }
  }, [notesTab, classSession.classId, classSession.subject]);

  const fallbackPresets: Record<string, string[]> = {
    Mathematics: ['algebra', 'geometry', 'trigonometry', 'calculus', 'practice'],
    Science: ['physics', 'chemistry', 'biology', 'lab', 'experiment'],
    History: ['timeline', 'event', 'figure', 'cause', 'effect'],
    English: ['grammar', 'vocabulary', 'reading', 'writing', 'comprehension']
  };
  const tagOptions = useMemo(() => (tagPresets[selectedSubject] || fallbackPresets[selectedSubject] || ['revision', 'exam', 'homework', 'unit']), [selectedSubject, tagPresets]);

  const [showInsights, setShowInsights] = useState(false);
  const [sessionInsights, setSessionInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const { startSession, endSession, generateCode, exportSession } = useTeacherSession({ classSession, onUpdateSession, historicalRecords });

  const handleStartSession = async () => {
    if (!selectedSubject) {
      setError('Please select a subject first.');
      return;
    }
    setError(null);
    try {
      const pos = await getCurrentPosition();
      await startSession(selectedSubject, pos.lat, pos.lng);
      setSuccessMessage('Session started successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError('Could not get location. Please allow location access.');
    }
  };

  const handleEndSession = async () => {
    if (window.confirm('Are you sure you want to end the current session?')) {
      await endSession();
      setSuccessMessage('Session ended successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      await generateCode(selectedSubject, 10);
      setSuccessMessage('New attendance code generated!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to generate code.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const headers = [t('Student ID'), t('Student Name'), t('Status'), t('Time')];
      const rows = attendance.map(a => [
        a.studentId,
        a.studentName,
        a.status,
        a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : '-'
      ]);

      const { exportToCSV } = await import('../services/exportService');
      exportToCSV([headers, ...rows], `session-report-${classSession.subject || 'class'}-${new Date().toISOString().split('T')[0]}.csv`);
      
      setSuccessMessage(t('Report exported successfully!'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t('Failed to export report'));
    }
  };

  return (
    <DashboardLayout
      sidebarItems={SIDEBAR_ITEMS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      userName={teacher.name}
      userRole="Teacher"
      userAvatar={teacher.faceImage}
      onLogout={onLogout}
      onShowProfile={() => setShowFaceRegistration(true)}
      theme={theme}
    >
      {activeTab === 'session' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2" padding="xl">
               <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{t('Session Control')}</h2>
                    <p className="text-gray-500">{t('Manage your active classroom session')}</p>
                  </div>
                  {classSession.isActive ? (
                    <Badge variant="success" size="lg" className="animate-pulse">{t('Live Now')}</Badge>
                  ) : (
                    <Badge variant="default" size="lg">{t('Inactive')}</Badge>
                  )}
               </div>

               <div className="space-y-6">
                  {!classSession.isActive ? (
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-700">{t('Select Subject')}</label>
                        <select 
                          value={selectedSubject} 
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        >
                          <option value="">{t('Choose a subject...')}</option>
                          {allSubjects.filter(s => teacher.assignedSubjects.includes(s.id)).map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <Button variant="primary" className="w-full h-12 text-lg" onClick={handleStartSession} icon={<Play size={20} />}>
                        {t('Start Live Session')}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t('Attendance Code')}</p>
                          <div className="flex items-center justify-between">
                             <p className="text-3xl font-black tracking-widest text-primary">{classSession.code || '---'}</p>
                             <Button variant="ghost" size="sm" onClick={handleGenerateCode} loading={isGeneratingCode} icon={<RefreshCw size={14} />} />
                          </div>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t('Time Remaining')}</p>
                          <p className="text-2xl font-bold flex items-center gap-2">
                             <Clock className="text-secondary" size={20} />
                             {timeRemaining}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="danger" className="flex-1 h-12" onClick={handleEndSession} icon={<XCircle size={18} />}>
                          {t('End Session')}
                        </Button>
                        <Button variant="secondary" className="flex-1 h-12" onClick={handleExportReport} icon={<Download size={18} />}>
                          {t('Export Report')}
                        </Button>
                      </div>
                    </div>
                  )}
               </div>
            </Card>

            <Card padding="lg" className="h-fit">
               <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <MapPin className="text-primary" size={20} />
                 {t('Location & Safety')}
               </h3>
               <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-bold text-gray-500 mb-2">{t('Current Coordinates')}</p>
                    <p className="text-sm font-medium">
                      {classSession.lat && classSession.lng ? 
                        `${classSession.lat.toFixed(4)}, ${classSession.lng.toFixed(4)}` : 
                        t('Location not set')}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-bold text-gray-500 mb-2">{t('Attendance Radius')}</p>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="5" 
                        max="500" 
                        value={attendanceRadius} 
                        onChange={(e) => setAttendanceRadius(parseInt(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-sm font-bold w-12 text-right">{attendanceRadius}m</span>
                    </div>
                  </div>
               </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card padding="md" hover>
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center text-green-600">
                   <UserCheck size={24} />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-gray-500">{t('Present Today')}</p>
                    <p className="text-2xl font-bold">{attendance.filter(a => a.status === 'Present').length}</p>
                 </div>
               </div>
            </Card>
            <Card padding="md" hover>
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600">
                   <HelpCircle size={24} />
                 </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('Quizzes Taken')}</p>
                    <p className="text-2xl font-bold">{quizStats.totalQuizzes || teacherStats.quizzesTaken}</p>
                  </div>
               </div>
            </Card>
            <Card padding="md" hover>
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                   <Award size={24} />
                 </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('Avg. Score')}</p>
                    <p className="text-2xl font-bold">{quizStats.avgScore || teacherStats.avgScore || 0}%</p>
                  </div>
               </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <Card className="lg:col-span-2" padding="xl">
                  <h3 className="text-xl font-bold mb-6">{t('Attendance Trends')}</h3>
                  <AttendanceChart data={weeklyAttendanceData.length > 0 ? weeklyAttendanceData : [
                     { date: t('Mon'), present: 0 },
                     { date: t('Tue'), present: 0 },
                     { date: t('Wed'), present: 0 },
                     { date: t('Thu'), present: 0 },
                     { date: t('Fri'), present: 0 },
                  ]} />
               </Card>
              <Card padding="lg">
                  <h3 className="text-lg font-bold mb-4">{t('Quick Stats')}</h3>
                  <div className="space-y-4">
                     <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                        <p className="text-xs font-bold text-green-600 uppercase">{t('Weekly Average')}</p>
                        <p className="text-2xl font-black text-green-700">{teacherStats.attendanceRate || Math.round((weeklyAttendanceData.reduce((s, d) => s + d.present, 0) / Math.max(weeklyAttendanceData.length, 1) / Math.max(students.length, 1)) * 100)}%</p>
                     </div>
                     <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                        <p className="text-xs font-bold text-orange-600 uppercase">{t('Total Students')}</p>
                        <p className="text-2xl font-black text-orange-700">{teacherStats.totalStudents || students.length}</p>
                     </div>
                  </div>
               </Card>
           </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card padding="xl">
              <h3 className="text-xl font-bold mb-6">{t('Class Performance Overview')}</h3>
              <PerformanceChart data={performanceData.length > 0 ? performanceData.map((p, i) => ({
                 date: p.subject || `${t('Subject')} ${i + 1}`,
                 score: p.avgScore || 0,
              })) : [
                 { date: t('No Data'), score: 0 },
              ]} />
           </Card>
            <GradeBook 
               students={students.map(s => ({ id: s.id, name: s.name, classId: s.classId }))} 
               currentUserId={teacher.id}
               currentUserRole="teacher"
               subjects={allSubjects.map(s => ({ id: s.id, name: s.name }))}
               theme={theme}
               attendance={attendance}
               onUpdatePerformance={onUpdateSession as any} 
            />
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card padding="xl">
                 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <Zap size={24} />
                 </div>
                 <h3 className="text-xl font-bold mb-2">{t('AI Quiz Generator')}</h3>
                 <p className="text-gray-500 mb-6">{t('Generate assessment questions instantly using Google Gemini AI.')}</p>
                 <div className="space-y-4">
                    <Input 
                      placeholder={t('Enter topic or paste content...')}
                      value={quizTopic}
                      onChange={(e) => setQuizTopic(e.target.value)}
                    />
                    <div className="flex gap-4">
                       <select 
                         className="flex-1 h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                         value={quizQuestionCount}
                         onChange={(e) => setQuizQuestionCount(parseInt(e.target.value))}
                       >
                         <option value={5}>5 {t('Questions')}</option>
                         <option value={10}>10 {t('Questions')}</option>
                         <option value={15}>15 {t('Questions')}</option>
                         <option value={20}>20 {t('Questions')}</option>
                       </select>
                       <Button 
                          variant="primary" 
                          className="flex-1"
                          onClick={async () => {
                            if (!quizTopic.trim()) return;
                            setIsGeneratingQuiz(true);
                            try {
                              const result = await generateQuizWorker({ notesText: quizTopic, subject: selectedSubject });
                              const quizArray = result?.quiz || [];
                              setGeneratedQuiz(quizArray);
                              setSuccessMessage(`${t('Generated')} ${quizArray.length} ${t('questions')}!`);
                              setTimeout(() => setSuccessMessage(null), 3000);
                            } catch (err) {
                              setError(t('Failed to generate quiz'));
                            } finally {
                              setIsGeneratingQuiz(false);
                            }
                          }}
                          loading={isGeneratingQuiz || workerGenerating}
                          disabled={!quizTopic.trim()}
                          icon={<Zap size={16} />}
                        >
                          {isGeneratingQuiz || workerGenerating ? t('Generating...') : `${t('Generate')} ${quizQuestionCount} ${t('Questions')}`}
                       </Button>
                    </div>
                    {workerError && <p className="text-sm text-red-500">{workerError}</p>}
                    {workerGenerating && (
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${workerProgress}%` }} />
                      </div>
                    )}
                 </div>
              </Card>
              <Card padding="xl">
                 <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-6">
                    <HelpCircle size={24} />
                 </div>
                 <h3 className="text-xl font-bold mb-2">{t('Live Quiz Control')}</h3>
                 <p className="text-gray-500 mb-6">{t('Monitor student progress and review class quiz performance.')}</p>
                 {publishedQuizzes.length > 0 ? (
                   <div className="space-y-3">
                     <select
                       value={selectedQuizId}
                       onChange={(e) => setSelectedQuizId(e.target.value)}
                       className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                     >
                       {publishedQuizzes.map((quiz) => (
                         <option key={quiz.id} value={quiz.id}>
                           {quiz.title} • {quiz.subject || t('General')}
                         </option>
                       ))}
                     </select>
                     {quizResultsSummary ? (
                       <div className="grid grid-cols-2 gap-3">
                         <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                           <p className="text-[10px] font-bold uppercase text-emerald-600">{t('Attempts')}</p>
                           <p className="text-2xl font-black text-emerald-700">{quizResultsSummary.totalAttempts || 0}</p>
                         </div>
                         <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                           <p className="text-[10px] font-bold uppercase text-indigo-600">{t('Average Score')}</p>
                           <p className="text-2xl font-black text-indigo-700">{quizResultsSummary.averageScore || 0}%</p>
                         </div>
                         <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                           <p className="text-[10px] font-bold uppercase text-amber-600">{t('Highest')}</p>
                           <p className="text-2xl font-black text-amber-700">{quizResultsSummary.highestScore || 0}%</p>
                         </div>
                         <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                           <p className="text-[10px] font-bold uppercase text-rose-600">{t('Pass Rate')}</p>
                           <p className="text-2xl font-black text-rose-700">{quizResultsSummary.passRate || 0}%</p>
                         </div>
                       </div>
                     ) : (
                       <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                         <p className="text-gray-400 font-medium">{t('No quiz results available yet')}</p>
                       </div>
                     )}
                   </div>
                 ) : (
                   <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                      <p className="text-gray-400 font-medium">{t('No quiz active')}</p>
                   </div>
                 )}
              </Card>
           </div>
           
           {generatedQuiz.length > 0 && (
             <Card padding="xl">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold">{t('Generated Questions')}</h3>
                 <div className="flex gap-2">
                   <Button variant="secondary" size="sm" onClick={async () => {
                     try {
                       await import('../services/dataService').then(m => m.upsertQuizToBank(generatedQuiz, selectedSubject));
                       setSuccessMessage(t('Questions saved to bank!'));
                       setTimeout(() => setSuccessMessage(null), 3000);
                     } catch (err) { console.error('Save failed:', err); }
                   }} icon={<Download size={14} />}>{t('Save to Bank')}</Button>
                   <Button variant="ghost" size="sm" onClick={() => setGeneratedQuiz([])}>{t('Clear')}</Button>
                 </div>
               </div>
               <div className="space-y-4">
                 {generatedQuiz.map((q, idx) => (
                   <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                     <div className="flex items-start gap-3">
                       <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">{idx + 1}</span>
                       <div className="flex-1">
                         <p className="font-medium mb-2">{q.question}</p>
                         {q.options && Array.isArray(q.options) && (
                           <div className="space-y-1 text-sm">
                             {q.options.map((opt: string, i: number) => (
                               <div key={i} className={opt === q.correctAnswer ? 'text-green-600 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                                 {String.fromCharCode(65 + i)}. {opt}
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </Card>
           )}

           <Card padding="xl">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold">{t('Quiz Results')}</h3>
               {selectedQuizId && (
                 <Badge variant="secondary" size="sm">
                   {publishedQuizzes.find((quiz) => quiz.id === selectedQuizId)?.title || t('Selected Quiz')}
                 </Badge>
               )}
             </div>
             {quizResultsRows.length > 0 ? (
               <div className="overflow-x-auto">
                 <table className="min-w-full text-sm">
                   <thead>
                     <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                       <th className="py-3 pr-4">{t('Student')}</th>
                       <th className="py-3 pr-4">{t('Score')}</th>
                       <th className="py-3 pr-4">{t('Correct')}</th>
                       <th className="py-3 pr-4">{t('Submitted')}</th>
                     </tr>
                   </thead>
                   <tbody>
                     {quizResultsRows.map((result) => (
                       <tr key={result.attemptId} className="border-b border-gray-100 dark:border-gray-800">
                         <td className="py-3 pr-4 font-medium">{result.studentName}</td>
                         <td className="py-3 pr-4">{result.score}%</td>
                         <td className="py-3 pr-4">{result.correctCount}/{result.totalQuestions}</td>
                         <td className="py-3 pr-4">{result.submittedAt ? new Date(result.submittedAt).toLocaleString() : t('Pending')}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             ) : (
               <div className="p-10 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                 <p className="text-gray-500">{t('Students have not submitted attempts for this quiz yet.')}</p>
               </div>
             )}
           </Card>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card padding="xl">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-xl font-bold">{t('Class Notes')}</h3>
                    <p className="text-sm text-gray-500">{t('Upload and manage teaching materials')}</p>
                 </div>
              </div>
              
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setNotesTab('session')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${notesTab === 'session' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
                >
                  {t('Session Notes')}
                </button>
                <button
                  onClick={() => setNotesTab('centralized')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${notesTab === 'centralized' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
                >
                  {t('Centralized Notes')}
                </button>
              </div>
              
              {notesTab === 'session' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">{t('Upload File')}</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploading(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          formData.append('classId', classSession.classId || '');
                          formData.append('subjectId', selectedSubject);
                          formData.append('type', 'session_notes');
                          formData.append('userId', teacher.id);
                          
                          const accessToken = (await import('../services/tokenManager')).tokenManager.getAccessToken();
                          const res = await fetch('/api/storage/upload', {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${accessToken}` },
                            body: formData,
                          });
                          
                          if (res.ok) {
                            setSuccessMessage(t('File uploaded successfully!'));
                            setTimeout(() => setSuccessMessage(null), 3000);
                          } else {
                            setError(t('Upload failed'));
                          }
                        } catch (err) {
                          setError(t('Upload failed'));
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">{t('Quick Notes')}</label>
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 h-40"
                      placeholder={t('Type your notes here...')}
                    />
                    <Button
                      variant="primary"
                      className="mt-2"
                      onClick={async () => {
                        if (!notesText.trim()) return;
                        setIsUploading(true);
                        try {
                          await import('../services/dataService').then(m => 
                            m.uploadClassNotes({
                              classId: classSession.classId || '',
                              subjectId: selectedSubject,
                              content: notesText,
                            })
                          );
                          setSuccessMessage(t('Notes saved!'));
                          setTimeout(() => setSuccessMessage(null), 3000);
                        } catch (err) {
                          setError(t('Failed to save notes'));
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                      loading={isUploading}
                    >
                      {t('Save Notes')}
                    </Button>
                  </div>
                </div>
              )}
              
              {notesTab === 'centralized' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {centralizedNotes.length === 0 ? (
                      <div className="col-span-2 p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">{t('No centralized notes yet')}</p>
                      </div>
                    ) : (
                      centralizedNotes.map((note: any, idx: number) => (
                        <div key={note.id || idx} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{note.title || t('Untitled')}</h4>
                              <p className="text-sm text-gray-500">{note.subjectId || selectedSubject}</p>
                              {note.createdAt && <p className="text-xs text-gray-400 mt-1">{new Date(note.createdAt).toLocaleDateString()}</p>}
                            </div>
                            <a href={note.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">{t('View')}</a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
                    <h4 className="font-bold mb-2">{t('Upload to Centralized Bank')}</h4>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploading(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          formData.append('classId', classSession.classId || '');
                          formData.append('subjectId', selectedSubject);
                          formData.append('title', file.name);
                          formData.append('noteType', 'centralized_notes');
                          formData.append('userId', teacher.id);
                          
                          const accessToken = (await import('../services/tokenManager')).tokenManager.getAccessToken();
                          const res = await fetch('/api/storage/centralized', {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${accessToken}` },
                            body: formData,
                          });
                          
                          if (res.ok) {
                            setSuccessMessage(t('Uploaded to centralized bank!'));
                            setTimeout(() => setSuccessMessage(null), 3000);
                          }
                        } catch (err) {
                          setError(t('Upload failed'));
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                </div>
              )}
           </Card>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <AnalyticsDashboard 
             students={students.map((student) => ({
               id: student.id,
               name: student.name,
               performance: Array.isArray(student.performance)
                 ? student.performance.map((entry) => ({
                     subject: entry.subject || selectedSubject || t('General'),
                     date: entry.date,
                     score: entry.score,
                   }))
                 : [],
               xp: student.xp,
               badges: student.badges,
               classId: student.classId || undefined,
             }))}
             attendance={attendance}
             subjects={allSubjects}
             currentUserRole="teacher"
             theme={theme}
          />
        </div>
      )}

      {activeTab === 'tickets' && (
        <TicketPanel userId={teacher.id} role="teacher" />
      )}
      
      {showFaceRegistration && (
        <WebcamCapture
          onCapture={async (img) => {
            onUpdateFaceImage(teacher.id, img);
            setShowFaceRegistration(false);
          }}
          onClose={() => setShowFaceRegistration(false)}
          theme={theme}
          title="Register Teacher Face"
        />
      )}
    </DashboardLayout>
  );
};

export default TeacherDashboard;
