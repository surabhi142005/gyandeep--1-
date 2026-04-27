import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  LineChart, 
  Zap, 
  Bell, 
  User, 
  LogOut, 
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  Award,
  Star,
  Coins,
  Activity,
  ChevronRight,
  PlayCircle,
  FileText,
  Camera,
  Download
} from 'lucide-react';
import type { Student, ClassSession, HistoricalSessionRecord } from '../types';
import WebcamCapture from './WebcamCapture';
import StudentFaceRegistration from './StudentFaceRegistration';
import { getCurrentPosition, calculateDistance } from '../services/locationService';
import { verifyFace, verifyLocation } from '../services/authService';
import Spinner from './Spinner';
import QuizView from './QuizView';
import PerformanceChart from './PerformanceChart';
import Leaderboard from './Leaderboard';
import AnnouncementBoard from './AnnouncementBoard';
import TicketPanel from './TicketPanel';
import type { Announcement } from './AnnouncementBoard';
import {
  fetchAvailableQuizzes,
  fetchBadges,
  fetchCentralizedNotesCombined,
  fetchCentralizedNotes,
  fetchStudentAttendanceHistory,
  fetchStudentNotes,
  listClassNotes
} from '../services/dataService';
import { realtimeClient } from '../services/realtimeClient';
const Dashboard3D = React.lazy(() => import('./Dashboard3D'));
import StudentLearningTwin from './StudentLearningTwin';
import { DashboardLayout, Card, Button, Badge, Input } from './ui';
import { t } from '../services/i18n';

const NotesList: React.FC<{ classId?: string; subjectId: string }> = ({ classId, subjectId }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotes = async () => {
      if (!subjectId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [sessionNotes, centralizedNotes] = await Promise.all([
          classId ? listClassNotes({ classId, subjectId }) : Promise.resolve({ data: [] }),
          fetchCentralizedNotes({ subjectId, classId })
        ]);
        
        const combined = [
          ...(Array.isArray(sessionNotes.data) ? sessionNotes.data : []),
          ...(Array.isArray(centralizedNotes) ? centralizedNotes : [])
        ];
        setNotes(combined);
      } catch (err) {
        console.error('Failed to load notes:', err);
      } finally {
        setLoading(false);
      }
    };
    loadNotes();
  }, [classId, subjectId]);

  if (loading) return <Spinner size="sm" />;
  if (notes.length === 0) return <p className="text-xs italic text-gray-500">No downloadable notes found.</p>;

  return (
    <div className="space-y-2 mt-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Downloadable Files</h4>
      {notes.map((note, idx) => (
        <div key={note.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-primary" />
            <div>
              <p className="text-sm font-medium line-clamp-1">{note.title || note.fileName || 'Untitled Note'}</p>
              <p className="text-[10px] text-gray-500">{note.noteType === 'centralized_notes' ? 'Centralized' : 'Session'}</p>
            </div>
          </div>
          <a 
            href={note.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-primary transition-colors"
            title="Download/View"
          >
            <Download size={16} />
          </a>
        </div>
      ))}
    </div>
  );
};

const SIDEBAR_ITEMS = [
  { id: 'learning', label: t('Learning Hub'), icon: BookOpen },
  { id: 'quiz', label: t('Quizzes'), icon: HelpCircle },
  { id: 'performance', label: t('My Progress'), icon: LineChart },
  { id: 'twin', label: t('Learning Twin'), icon: Zap },
  { id: 'announcements', label: t('Notice Board'), icon: Bell },
  { id: 'profile', label: t('Profile'), icon: User },
];

const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
  student, classSession, onMarkAttendance, onUpdatePerformance, 
  onLogout, onShowNotification, theme, onUpdateFaceImage, 
  historicalSessions, allStudents = [], announcements = [], 
  onUpdateSession 
}) => {
  const [activeTab, setActiveTab] = useState('learning');
  const [code, setCode] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [quizTaken, setQuizTaken] = useState(false);
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [performanceTab, setPerformanceTab] = useState<'current' | 'all'>('current');
  const prevSessionRef = useRef<ClassSession | undefined>(undefined);
  const [selectedPreviousNoteInfo, setSelectedPreviousNoteInfo] = useState<{ id: number; subject: string; date: string } | null>(null);
  const [selectedPreviousNoteText, setSelectedPreviousNoteText] = useState<string | null>(null);
  const [examNotesSubject, setExamNotesSubject] = useState(classSession.subject || '');
  const [examUnits, setExamUnits] = useState<{ unitNumber: number; unitName: string; notes: any[] }[]>([]);
  const [examNotesLoading, setExamNotesLoading] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);
  const [notesTab, setNotesTab] = useState<'session' | 'centralized'>('session');
  const [badges, setBadges] = useState<string[]>(Array.isArray(student.badges) ? student.badges : []);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [studentNotes, setStudentNotes] = useState<any[]>([]);

  const sessionEnded = !!classSession.endedAt;

  // Use gamification stats from student object
  const stats = useMemo(() => ({
    xp: student.xp || 0,
    level: student.level || 1,
    coins: student.coins || 0
  }), [student.xp, student.level, student.coins]);

  // Fetch centralized exam notes when subject changes
  const loadExamNotes = useCallback(async (subject: string) => {
    if (!subject) return;
    setExamNotesLoading(true);
    try {
      const units = await fetchCentralizedNotesCombined({ subjectId: subject, classId: student.classId || undefined });
      setExamUnits(Array.isArray(units) ? units : []);
    } catch {
      setExamUnits([]);
    } finally {
      setExamNotesLoading(false);
    }
  }, [student.classId]);

  useEffect(() => {
    if (examNotesSubject) loadExamNotes(examNotesSubject);
  }, [examNotesSubject, loadExamNotes]);

  useEffect(() => {
    setBadges(Array.isArray(student.badges) ? student.badges : []);
  }, [student.id, student.badges]);

  useEffect(() => {
    let cancelled = false;

    if (!student?.id) return () => { cancelled = true; };

    fetchBadges(student.id)
      .then((nextBadges) => {
        if (!cancelled) {
          setBadges(Array.isArray(nextBadges) ? nextBadges : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBadges(Array.isArray(student.badges) ? student.badges : []);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [student?.id]);

  useEffect(() => {
    setQuizTaken(false);
  }, [classSession.code]);

  useEffect(() => {
    setQuizTaken(false);
  }, [selectedQuiz?.id]);

  // RT-4: Subscribe to XP updates in real-time
  useEffect(() => {
    if (!student?.id) return;
    
    const unsubXp = realtimeClient.on('xp_updated', (data) => {
      if (data.studentId === student.id) {
        onShowNotification(`+${data.xpAwarded || 0} XP earned!`, 'success');
        if (data.coinsAwarded > 0) {
          onShowNotification(`+${data.coinsAwarded} coins earned!`, 'success');
        }
      }
    });

    return () => {
      unsubXp();
    };
  }, [student?.id]);

  useEffect(() => {
    if (!student?.id) return;

    fetchStudentAttendanceHistory(student.id, { limit: 6 })
      .then((data) => {
        setAttendanceHistory(Array.isArray(data?.records) ? data.records : []);
        setAttendanceSummary(data?.stats || null);
      })
      .catch((err) => {
        console.error('Failed to load attendance history:', err);
        setAttendanceHistory([]);
        setAttendanceSummary(null);
      });
  }, [student?.id, student.attendanceMarked]);

  useEffect(() => {
    if (!student.classId) {
      setAvailableQuizzes([]);
      return;
    }

    fetchAvailableQuizzes(student.classId)
      .then((data) => {
        setAvailableQuizzes(Array.isArray(data?.quizzes) ? data.quizzes : []);
      })
      .catch((err) => {
        console.error('Failed to load available quizzes:', err);
        setAvailableQuizzes([]);
      });
  }, [student.classId, quizTaken]);

  useEffect(() => {
    if (!student.classId) {
      setStudentNotes([]);
      return;
    }

    fetchStudentNotes(student.classId, classSession.subject || undefined)
      .then((data) => {
        setStudentNotes(Array.isArray(data?.notes) ? data.notes : []);
      })
      .catch((err) => {
        console.error('Failed to load student notes:', err);
        setStudentNotes([]);
      });
  }, [student.classId, classSession.subject]);

  const handleAttendance = async (imageDataUrl: string) => {
    setIsVerifying(true);
    setMessage(null);
    try {
      const pos = await getCurrentPosition();
      const teacherPos = { lat: classSession.lat || 0, lng: classSession.lng || 0 };
      const locRes = await verifyLocation(pos, teacherPos, classSession.radius || 10);
      if (!locRes.authenticated) throw new Error('You are not in the classroom range');

      if (code !== classSession.code) throw new Error('Invalid attendance code');

      const faceRes = await verifyFace(imageDataUrl, student.id, {
        recordAttendance: true,
        sessionId: classSession.id,
        classId: classSession.classId,
        location: pos,
      });
      if (!faceRes.authenticated) throw new Error('Face verification failed');

      onMarkAttendance(student.id);
      setMessage({ type: 'success', text: 'Attendance marked successfully!' });
      setShowWebcam(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <DashboardLayout
      sidebarItems={SIDEBAR_ITEMS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      userName={student.name}
      userRole={`Level ${stats.level} Student`}
      userAvatar={student.faceImage}
      onLogout={onLogout}
      onShowProfile={() => setActiveTab('profile')}
      theme={theme}
    >
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Gamification Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card padding="md" featured hover>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Star size={24} className="fill-white text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80 text-white">{t('Experience Points')}</p>
                  <p className="text-2xl font-black text-white">{stats.xp} XP</p>
                </div>
              </div>
           </Card>
           <Card padding="md" hover>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-secondary-15)' }}>
                  <Award size={24} style={{ color: 'var(--color-secondary)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{t('Current Level')}</p>
                  <p className="text-2xl font-black" style={{ color: 'var(--color-secondary)' }}>{t('Level')} {stats.level}</p>
                </div>
              </div>
           </Card>
           <Card padding="md" hover>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                  <Coins size={24} style={{ color: '#D97706' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{t('Gyandeep Coins')}</p>
                  <p className="text-2xl font-black" style={{ color: '#D97706' }}>{stats.coins} GDC</p>
                </div>
              </div>
           </Card>
        </div>

        {activeTab === 'learning' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
               <Card padding="xl">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{t('Active Session')}</h2>
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('Join your live classroom session')}</p>
                    </div>
                    {classSession.isActive ? (
                      <Badge variant="xp" size="lg" animated>{t('LIVE SESSION')}</Badge>
                    ) : (
                      <Badge variant="default" size="lg">{t('NO ACTIVE SESSION')}</Badge>
                    )}
                  </div>

                  {!classSession.isActive ? (
                    <div className="py-12 text-center rounded-2xl border-2 border-dashed" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                       <Activity size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
                       <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-muted)' }}>{t('Wait for your teacher to start')}</h3>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       <div className="p-6 rounded-2xl flex items-center justify-between" style={{ backgroundColor: 'var(--color-primary-10)', border: '1px solid var(--color-primary-15)' }}>
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)' }}>
                                <BookOpen size={28} />
                             </div>
                             <div>
                                <p className="text-sm font-bold uppercase tracking-tighter" style={{ color: 'var(--color-primary)' }}>{t('Current Subject')}</p>
                                <p className="text-xl font-black">{classSession.subject}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{t('Started At')}</p>
                             <p className="text-sm font-medium">{new Date(classSession.startedAt!).toLocaleTimeString()}</p>
                          </div>
                       </div>

                        {!student.attendanceMarked ? (
                          <div className="space-y-4">
                             <label className="block text-sm font-bold" style={{ color: 'var(--color-text)' }}>{t('Enter Attendance Code')}</label>
                             <div className="flex flex-col sm:flex-row gap-3">
                                <Input 
                                  value={code} 
                                  onChange={e => setCode(e.target.value)} 
                                  placeholder={t('e.g. 4829')} 
                                  className="text-center text-2xl font-black tracking-widest h-11 sm:h-14"
                                />
                                <Button variant="primary" className="h-11 sm:h-14 px-6 sm:px-8 text-base" onClick={() => setShowWebcam(true)}>
                                  {t('Verify & Mark')}
                                </Button>
                             </div>
                          </div>
                        ) : (
                         <div className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#16A34A' }}>
                            <CheckCircle2 size={24} />
                            <p className="font-bold">{t('Attendance marked for this session!')}</p>
                         </div>
                       )}
                    </div>
                  )}
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <Card padding="lg" hover onClick={() => setActiveTab('quiz')}>
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#F97316' }}>
                            <HelpCircle size={24} />
                         </div>
                         <div>
                            <h3 className="font-bold">{t('Live Quiz')}</h3>
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('Take the session quiz')}</p>
                         </div>
                         <ChevronRight className="ml-auto" size={20} style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                   </Card>
                   <Card padding="lg" hover onClick={() => setActiveTab('twin')}>
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-secondary-15)', color: 'var(--color-secondary)' }}>
                            <Zap size={24} />
                         </div>
                         <div>
                            <h3 className="font-bold">{t('Digital Twin')}</h3>
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('AI Learning Assistant')}</p>
                         </div>
                         <ChevronRight className="ml-auto" size={20} style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                   </Card>
                </div>
             </div>

             <div className="space-y-8">
                <AnnouncementBoard announcements={announcements} canPost={false} theme={theme} />
                <Card padding="lg">
                   <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                     <Award size={20} style={{ color: 'var(--color-secondary)' }} />
                     {t('Achievement Badges')}
                   </h3>
                   {badges.length > 0 ? (
                     <div className="flex flex-wrap gap-2">
                       {badges.map((badgeName) => (
                         <Badge key={badgeName} variant="secondary" size="sm">
                           {badgeName}
                         </Badge>
                       ))}
                     </div>
                   ) : (
                     <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>
                       {t('No badges earned yet. Complete quizzes and keep your streak going.')}
                     </p>
                   )}
                </Card>
                <Card padding="lg">
                   <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                     <Activity size={20} style={{ color: 'var(--color-secondary)' }} />
                     {t('Session Notes')}
                   </h3>
                   <div className="space-y-4">
                      {classSession.notes ? (
                        <p className="text-sm leading-relaxed p-4 rounded-xl italic" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
                          "{classSession.notes}"
                        </p>
                      ) : (
                        <p className="text-sm italic text-gray-500">{t('No session notes available.')}</p>
                      )}
                      
                      {classSession.subject && (
                        <NotesList classId={student.classId} subjectId={classSession.subject} />
                      )}
                   </div>
                </Card>

                <Card padding="lg">
                   <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                     <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
                     {t('My Attendance')}
                   </h3>
                   {attendanceSummary ? (
                     <div className="space-y-3">
                       <div className="grid grid-cols-3 gap-3">
                         <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                           <p className="text-[10px] font-bold uppercase text-emerald-600">{t('Present')}</p>
                           <p className="text-lg font-black text-emerald-700">{attendanceSummary.present || 0}</p>
                         </div>
                         <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                           <p className="text-[10px] font-bold uppercase text-amber-600">{t('Late')}</p>
                           <p className="text-lg font-black text-amber-700">{attendanceSummary.late || 0}</p>
                         </div>
                         <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                           <p className="text-[10px] font-bold uppercase text-rose-600">{t('Absent')}</p>
                           <p className="text-lg font-black text-rose-700">{attendanceSummary.absent || 0}</p>
                         </div>
                       </div>
                       <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                         {t('Attendance Rate')}: {attendanceSummary.attendanceRate || 0}%
                       </p>
                       <div className="space-y-2">
                         {attendanceHistory.length > 0 ? attendanceHistory.map((record) => (
                           <div key={record.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                             <div>
                               <p className="text-sm font-semibold">{record.subject || t('General Session')}</p>
                               <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{record.date || t('Unknown date')}</p>
                             </div>
                             <Badge variant={record.status === 'Present' ? 'success' : record.status === 'Late' ? 'secondary' : 'danger'} size="sm">
                               {record.status}
                             </Badge>
                           </div>
                         )) : (
                           <p className="text-sm italic text-gray-500">{t('No attendance records yet.')}</p>
                         )}
                       </div>
                     </div>
                   ) : (
                     <p className="text-sm italic text-gray-500">{t('Attendance history is loading or unavailable.')}</p>
                   )}
                </Card>

                <Card padding="lg">
                   <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                     <BookOpen size={20} style={{ color: 'var(--color-primary)' }} />
                     {t('Centralized Library')}
                   </h3>
                   <div className="space-y-4">
                      <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                        {['Mathematics', 'Science', 'English', 'History'].map(sub => (
                          <button
                            key={sub}
                            onClick={() => setExamNotesSubject(sub)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${examNotesSubject === sub ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
                          >
                            {t(sub)}
                          </button>
                        ))}
                      </div>
                      <NotesList classId={student.classId} subjectId={examNotesSubject} />
                   </div>
                </Card>

                <Card padding="lg">
                   <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                     <FileText size={20} style={{ color: 'var(--color-secondary)' }} />
                     {t('My Notes')}
                   </h3>
                   <div className="space-y-3">
                     {studentNotes.length > 0 ? studentNotes.slice(0, 5).map((note) => (
                       <div key={note.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                         <div>
                           <p className="text-sm font-semibold">{note.fileName || t('Shared note')}</p>
                           <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{note.subject || t('General')}</p>
                         </div>
                         {note.fileUrl ? (
                           <a href={note.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">
                             {t('Open')}
                           </a>
                         ) : (
                           <span className="text-xs text-gray-400">{t('No file')}</span>
                         )}
                       </div>
                     )) : (
                       <p className="text-sm italic text-gray-500">{t('No class notes have been shared yet.')}</p>
                     )}
                   </div>
                </Card>
             </div>
           </div>
         )}

         {activeTab === 'quiz' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card padding="xl">
                 <div className="flex justify-between items-center mb-8">
                    <div>
                       <h2 className="text-2xl font-bold">{t('Quiz Center')}</h2>
                       <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('Challenge yourself and earn XP')}</p>
                    </div>
                    <Badge variant="xp" size="lg">{t('Ready to play')}</Badge>
                 </div>
                 
                 {quizTaken ? (
                   <div className="py-16 text-center">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22C55E' }}>
                         <CheckCircle2 size={40} />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{t('Quiz Completed!')}</h3>
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t("You've earned 50 XP for completing today's quiz.")}</p>
                      <Button variant="secondary" className="mt-8" onClick={() => setQuizTaken(false)}>{t('Back to Quizzes')}</Button>
                   </div>
                 ) : classSession.quiz && classSession.quiz.length > 0 ? (
                    <QuizView 
                      quiz={classSession.quiz || []}
                      subject={classSession.subject || 'General'}
                      sessionId={classSession.id}
                      studentId={student.id}
                      onSubmit={(score) => {
                        onUpdatePerformance(student.id, classSession.subject || 'General', score);
                        setQuizTaken(true);
                      }}
                      theme={theme}
                    />
                 ) : selectedQuiz ? (
                    <QuizView
                      quiz={selectedQuiz.questions || []}
                      subject={selectedQuiz.subject || 'General'}
                      sessionId={selectedQuiz.sessionId}
                      studentId={student.id}
                      onSubmit={(score) => {
                        onUpdatePerformance(student.id, selectedQuiz.subject || 'General', score);
                        setQuizTaken(true);
                      }}
                      theme={theme}
                    />
                 ) : (
                    <div className="space-y-4">
                      {availableQuizzes.length > 0 ? availableQuizzes.map((quiz) => (
                        <div key={quiz.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <p className="text-lg font-bold">{quiz.title}</p>
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                              {quiz.subject || t('General')} • {quiz.questionCount || 0} {t('questions')}
                            </p>
                            {quiz.alreadyAttempted && (
                              <p className="text-xs mt-1 text-emerald-600 font-semibold">
                                {t('Completed')} {quiz.attemptScore != null ? `• ${quiz.attemptScore}%` : ''}
                              </p>
                            )}
                          </div>
                          <Button
                            variant={quiz.alreadyAttempted ? 'secondary' : 'primary'}
                            onClick={() => setSelectedQuiz(quiz)}
                          >
                            {quiz.alreadyAttempted ? t('Review Quiz') : t('Start Quiz')}
                          </Button>
                        </div>
                      )) : (
                        <div className="py-12 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                          <HelpCircle size={40} className="mx-auto mb-4 text-gray-300" />
                          <p className="font-semibold">{t('No published quizzes available right now.')}</p>
                        </div>
                      )}
                    </div>
                 )}
              </Card>
           </div>
         )}

         {activeTab === 'performance' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 space-y-8">
                    <Card padding="xl">
                       <h3 className="text-xl font-bold mb-6">{t('Your Progress')}</h3>
                       <PerformanceChart data={student.performance || []} />
                    </Card>
                    <Card padding="xl">
                       <h3 className="text-xl font-bold mb-6">{t('Subject Breakdown')}</h3>
                       <div className="space-y-4">
                          {['Mathematics', 'Science', 'English'].map(sub => (
                            <div key={sub}>
                               <div className="flex justify-between text-sm mb-2">
                                  <span className="font-bold">{t(sub)}</span>
                                  <span className="font-bold" style={{ color: 'var(--color-primary)' }}>85%</span>
                               </div>
                               <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-primary-10)' }}>
                                  <div className="h-full rounded-full" style={{ background: 'var(--gradient)', width: '85%' }} />
                               </div>
                            </div>
                          ))}
                       </div>
                    </Card>
                 </div>
                 <div className="space-y-8">
                    <Leaderboard students={allStudents} currentStudentId={student.id} theme={theme} />
                 </div>
              </div>
           </div>
         )}

         {activeTab === 'twin' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card padding="none" className="overflow-hidden h-[600px] flex flex-col">
                 <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-secondary-15)', color: 'var(--color-secondary)' }}>
                          <Zap size={20} />
                       </div>
                       <div>
                          <h3 className="font-bold">{t('AI Learning Twin')}</h3>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('Personalized study partner')}</p>
                       </div>
                    </div>
                    <Badge variant="success" size="sm">{t('Online')}</Badge>
                 </div>
                 <div className="flex-1 overflow-hidden relative">
                    <StudentLearningTwin student={student} theme={theme} />
                 </div>
              </Card>
           </div>
         )}

         {activeTab === 'announcements' && (
           <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold mb-6">{t('Important Notices')}</h2>
              {announcements.map((ann, idx) => (
                <Card key={idx} padding="lg" hover>
                   <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center" style={{ 
                        backgroundColor: ann.priority === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                        color: ann.priority === 'high' ? '#EF4444' : '#0EA5E9'
                      }}>
                         <Bell size={24} />
                      </div>
                      <div>
                         <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold">{ann.title}</h3>
                            {ann.priority === 'high' && <Badge variant="danger" size="xs">{t('Priority')}</Badge>}
                         </div>
                         <p className="mb-3 leading-relaxed" style={{ color: 'var(--color-text)' }}>{ann.content}</p>
                         <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(ann.createdAt).toLocaleDateString()} • {t('By')} {ann.author}</p>
                      </div>
                   </div>
                </Card>
              ))}
           </div>
         )}

         {activeTab === 'profile' && (
           <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card padding="xl">
                 <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group">
                       <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-2xl" style={{ border: '4px solid var(--color-primary)', padding: '2px', background: 'var(--color-surface)' }}>
                          {student.faceImage ? (
                            <img src={student.faceImage} alt={t('Profile')} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <div className="w-full h-full rounded-2xl flex items-center justify-center text-white text-4xl font-black" style={{ background: 'var(--gradient)' }}>
                               {student.name[0]}
                            </div>
                          )}
                       </div>
                       <button 
                         onClick={() => setShowFaceRegistration(true)}
                         className="absolute -bottom-2 -right-2 w-10 h-10 shadow-lg rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                         style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)' }}
                         aria-label={t('Update Face ID')}
                       >
                          <Camera size={20} />
                       </button>
                    </div>
                    <div className="text-center md:text-left flex-1">
                       <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                          <h2 className="text-3xl font-black">{student.name}</h2>
                          <Badge variant="streak" size="sm">Top 5%</Badge>
                       </div>
                       <p className="font-medium mb-4" style={{ color: 'var(--color-text-muted)' }}>{student.email} • ID: {student.id}</p>
                       <div className="flex flex-wrap justify-center md:justify-start gap-4">
                          <div className="px-4 py-2 rounded-xl" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                             <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{t('Class')}</p>
                             <p className="font-bold">{student.classId || t('Not Assigned')}</p>
                          </div>
                         <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{t('Member Since')}</p>
                            <p className="font-bold">Aug 2025</p>
                         </div>
                      </div>
                   </div>
                </div>
             </Card>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card padding="lg">
                   <h3 className="font-bold mb-4">{t('Account Settings')}</h3>
                   <div className="space-y-3">
                      <Button variant="ghost" className="w-full justify-start" icon={<Settings size={18} />}>{t('Security & Password')}</Button>
                      <Button variant="ghost" className="w-full justify-start" icon={<Bell size={18} />}>{t('Notification Preferences')}</Button>
                      <Button variant="ghost" className="w-full justify-start text-red-500" onClick={onLogout} icon={<LogOut size={18} />}>{t('Sign Out')}</Button>
                   </div>
                </Card>
                <Card padding="lg">
                   <h3 className="font-bold mb-4">{t('Learning Preferences')}</h3>
                   <div className="space-y-3">
                      <Button variant="ghost" className="w-full justify-start" icon={<Activity size={18} />}>{t('Accessibility Options')}</Button>
                      <Button variant="ghost" className="w-full justify-start" icon={<PlayCircle size={18} />}>{t('Auto-play Quizzes')}</Button>
                   </div>
                </Card>
             </div>
          </div>
        )}
      </div>

      <TicketPanel userId={student.id} role="student" />

      {showWebcam && (
        <WebcamCapture
          onCapture={handleAttendance}
          onClose={() => setShowWebcam(false)}
          theme={theme}
          title="Face Verification"
          buttonText={isVerifying ? "Verifying..." : "Capture & Verify"}
          liveness
        />
      )}

      {showFaceRegistration && (
        <StudentFaceRegistration
          userId={student.id}
          onCapture={(img) => {
            onUpdateFaceImage(student.id, img);
            setShowFaceRegistration(false);
          }}
          onSuccess={() => setShowFaceRegistration(false)}
          onClose={() => setShowFaceRegistration(false)}
        />
      )}
    </DashboardLayout>
  );
};

interface StudentDashboardProps {
  student: Student;
  classSession: ClassSession;
  onMarkAttendance: (studentId: string) => void;
  onUpdatePerformance: (studentId: string, subject: string, score: number) => void;
  onLogout: () => void;
  onShowNotification: (message: string, type?: 'info' | 'success') => void;
  theme: string;
  onUpdateFaceImage: (studentId: string, faceImage: string) => void;
  historicalSessions: HistoricalSessionRecord[];
  allStudents?: Student[];
  announcements?: Announcement[];
  onUpdateSession?: (sessionUpdate: Partial<ClassSession>) => void;
}

export default StudentDashboard;
