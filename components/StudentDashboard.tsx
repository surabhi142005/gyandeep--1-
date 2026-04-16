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
  Camera
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
import { fetchCentralizedNotesCombined } from '../services/dataService';
import { realtimeClient } from '../services/realtimeClient';
const Dashboard3D = React.lazy(() => import('./Dashboard3D'));
import StudentLearningTwin from './StudentLearningTwin';
import { DashboardLayout, Card, Button, Badge, Input } from './ui';

const SIDEBAR_ITEMS = [
  { id: 'learning', label: 'Learning Hub', icon: BookOpen },
  { id: 'quiz', label: 'Quizzes', icon: HelpCircle },
  { id: 'performance', label: 'My Progress', icon: LineChart },
  { id: 'twin', label: 'Learning Twin', icon: Zap },
  { id: 'announcements', label: 'Notice Board', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
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
    setQuizTaken(false);
  }, [classSession.code]);

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

  const handleAttendance = async (imageDataUrl: string) => {
    setIsVerifying(true);
    setMessage(null);
    try {
      const faceRes = await verifyFace(imageDataUrl, student.id);
      if (!faceRes.authenticated) throw new Error('Face verification failed');

      const pos = await getCurrentPosition();
      const teacherPos = { lat: classSession.lat || 0, lng: classSession.lng || 0 };
      const locRes = await verifyLocation(pos, teacherPos, classSession.radius || 10);
      if (!locRes.authenticated) throw new Error('You are not in the classroom range');

      if (code !== classSession.code) throw new Error('Invalid attendance code');

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
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80 text-white">Experience Points</p>
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
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Current Level</p>
                  <p className="text-2xl font-black" style={{ color: 'var(--color-secondary)' }}>Level {stats.level}</p>
                </div>
              </div>
           </Card>
           <Card padding="md" hover>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                  <Coins size={24} style={{ color: '#D97706' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Gyandeep Coins</p>
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
                      <h2 className="text-2xl font-bold mb-1">Active Session</h2>
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Join your live classroom session</p>
                    </div>
                    {classSession.isActive ? (
                      <Badge variant="xp" size="lg" animated>LIVE SESSION</Badge>
                    ) : (
                      <Badge variant="default" size="lg">NO ACTIVE SESSION</Badge>
                    )}
                  </div>

                  {!classSession.isActive ? (
                    <div className="py-12 text-center rounded-2xl border-2 border-dashed" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                       <Activity size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
                       <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-muted)' }}>Wait for your teacher to start</h3>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       <div className="p-6 rounded-2xl flex items-center justify-between" style={{ backgroundColor: 'var(--color-primary-10)', border: '1px solid var(--color-primary-15)' }}>
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)' }}>
                                <BookOpen size={28} />
                             </div>
                             <div>
                                <p className="text-sm font-bold uppercase tracking-tighter" style={{ color: 'var(--color-primary)' }}>Current Subject</p>
                                <p className="text-xl font-black">{classSession.subject}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>Started At</p>
                             <p className="text-sm font-medium">{new Date(classSession.startedAt!).toLocaleTimeString()}</p>
                          </div>
                       </div>

                        {!student.attendanceMarked ? (
                          <div className="space-y-4">
                             <label className="block text-sm font-bold" style={{ color: 'var(--color-text)' }}>Enter Attendance Code</label>
                             <div className="flex flex-col sm:flex-row gap-3">
                                <Input 
                                  value={code} 
                                  onChange={e => setCode(e.target.value)} 
                                  placeholder="e.g. 4829" 
                                  className="text-center text-2xl font-black tracking-widest h-11 sm:h-14"
                                />
                                <Button variant="primary" className="h-11 sm:h-14 px-6 sm:px-8 text-base" onClick={() => setShowWebcam(true)}>
                                  Verify & Mark
                                </Button>
                             </div>
                          </div>
                        ) : (
                         <div className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#16A34A' }}>
                            <CheckCircle2 size={24} />
                            <p className="font-bold">Attendance marked for this session!</p>
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
                            <h3 className="font-bold">Live Quiz</h3>
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Take the session quiz</p>
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
                            <h3 className="font-bold">Digital Twin</h3>
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>AI Learning Assistant</p>
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
                     <Activity size={20} style={{ color: 'var(--color-secondary)' }} />
                     Session Notes
                   </h3>
                   <div className="space-y-3">
                      {classSession.notes ? (
                        <p className="text-sm leading-relaxed p-4 rounded-xl italic" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
                          "{classSession.notes}"
                        </p>
                      ) : (
                        <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>No notes from teacher yet.</p>
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
                       <h2 className="text-2xl font-bold">Quiz Center</h2>
                       <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Challenge yourself and earn XP</p>
                    </div>
                    <Badge variant="xp" size="lg">Ready to play</Badge>
                 </div>
                 
                 {quizTaken ? (
                   <div className="py-16 text-center">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22C55E' }}>
                         <CheckCircle2 size={40} />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Quiz Completed!</h3>
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>You've earned 50 XP for completing today's quiz.</p>
                      <Button variant="secondary" className="mt-8" onClick={() => setQuizTaken(false)}>Review Answers</Button>
                   </div>
                 ) : (
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
                 )}
              </Card>
           </div>
         )}

         {activeTab === 'performance' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 space-y-8">
                    <Card padding="xl">
                       <h3 className="text-xl font-bold mb-6">Your Progress</h3>
                       <PerformanceChart data={student.performance || []} />
                    </Card>
                    <Card padding="xl">
                       <h3 className="text-xl font-bold mb-6">Subject Breakdown</h3>
                       <div className="space-y-4">
                          {['Mathematics', 'Science', 'English'].map(sub => (
                            <div key={sub}>
                               <div className="flex justify-between text-sm mb-2">
                                  <span className="font-bold">{sub}</span>
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
                          <h3 className="font-bold">AI Learning Twin</h3>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Personalized study partner</p>
                       </div>
                    </div>
                    <Badge variant="success" size="sm">Online</Badge>
                 </div>
                 <div className="flex-1 overflow-hidden relative">
                    <StudentLearningTwin student={student} theme={theme} />
                 </div>
              </Card>
           </div>
         )}

         {activeTab === 'announcements' && (
           <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold mb-6">Important Notices</h2>
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
                            {ann.priority === 'high' && <Badge variant="danger" size="xs">Priority</Badge>}
                         </div>
                         <p className="mb-3 leading-relaxed" style={{ color: 'var(--color-text)' }}>{ann.content}</p>
                         <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(ann.createdAt).toLocaleDateString()} • By {ann.author}</p>
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
                            <img src={student.faceImage} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
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
                             <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>Class</p>
                             <p className="font-bold">{student.classId || 'Not Assigned'}</p>
                          </div>
                         <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Member Since</p>
                            <p className="font-bold">Aug 2025</p>
                         </div>
                      </div>
                   </div>
                </div>
             </Card>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card padding="lg">
                   <h3 className="font-bold mb-4">Account Settings</h3>
                   <div className="space-y-3">
                      <Button variant="ghost" className="w-full justify-start" icon={<Settings size={18} />}>Security & Password</Button>
                      <Button variant="ghost" className="w-full justify-start" icon={<Bell size={18} />}>Notification Preferences</Button>
                      <Button variant="ghost" className="w-full justify-start text-red-500" onClick={onLogout} icon={<LogOut size={18} />}>Sign Out</Button>
                   </div>
                </Card>
                <Card padding="lg">
                   <h3 className="font-bold mb-4">Learning Preferences</h3>
                   <div className="space-y-3">
                      <Button variant="ghost" className="w-full justify-start" icon={<Activity size={18} />}>Accessibility Options</Button>
                      <Button variant="ghost" className="w-full justify-start" icon={<PlayCircle size={18} />}>Auto-play Quizzes</Button>
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
