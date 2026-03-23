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
           <Card padding="md" hover className="bg-theme-gradient text-white border-none shadow-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Star size={24} className="fill-white" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">Experience Points</p>
                  <p className="text-2xl font-black">{stats.xp} XP</p>
                </div>
              </div>
           </Card>
           <Card padding="md" hover>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <Award size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Level</p>
                  <p className="text-2xl font-black text-secondary">Level {stats.level}</p>
                </div>
              </div>
           </Card>
           <Card padding="md" hover>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Coins size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gyandeep Coins</p>
                  <p className="text-2xl font-black text-amber-600">{stats.coins} GDC</p>
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
                      <p className="text-gray-500">Join your live classroom session</p>
                    </div>
                    {classSession.isActive ? (
                      <Badge variant="streak" size="lg" className="animate-bounce">LIVE SESSION</Badge>
                    ) : (
                      <Badge variant="default" size="lg">NO ACTIVE SESSION</Badge>
                    )}
                  </div>

                  {!classSession.isActive ? (
                    <div className="py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                       <Activity size={48} className="mx-auto text-gray-300 mb-4" />
                       <h3 className="text-lg font-bold text-gray-400">Wait for your teacher to start</h3>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm text-primary">
                                <BookOpen size={28} />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-primary uppercase tracking-tighter">Current Subject</p>
                                <p className="text-xl font-black">{classSession.subject}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-bold text-gray-500 uppercase">Started At</p>
                             <p className="text-sm font-medium">{new Date(classSession.startedAt!).toLocaleTimeString()}</p>
                          </div>
                       </div>

                        {!student.attendanceMarked ? (
                          <div className="space-y-4">
                             <label className="block text-sm font-bold text-gray-700">Enter Attendance Code</label>
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
                         <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 flex items-center gap-3">
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
                        <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                           <HelpCircle size={24} />
                        </div>
                        <div>
                           <h3 className="font-bold">Live Quiz</h3>
                           <p className="text-sm text-gray-500">Take the session quiz</p>
                        </div>
                        <ChevronRight className="ml-auto text-gray-300" size={20} />
                     </div>
                  </Card>
                  <Card padding="lg" hover onClick={() => setActiveTab('twin')}>
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                           <Zap size={24} />
                        </div>
                        <div>
                           <h3 className="font-bold">Digital Twin</h3>
                           <p className="text-sm text-gray-500">AI Learning Assistant</p>
                        </div>
                        <ChevronRight className="ml-auto text-gray-300" size={20} />
                     </div>
                  </Card>
               </div>
            </div>

            <div className="space-y-8">
               <AnnouncementBoard announcements={announcements} canPost={false} theme={theme} />
               <Card padding="lg">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-secondary" />
                    Session Notes
                  </h3>
                  <div className="space-y-3">
                     {classSession.notes ? (
                       <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl italic">
                         "{classSession.notes}"
                       </p>
                     ) : (
                       <p className="text-sm text-gray-400 italic">No notes from teacher yet.</p>
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
                      <p className="text-gray-500">Challenge yourself and earn XP</p>
                   </div>
                   <Badge variant="xp" size="lg">Ready to play</Badge>
                </div>
                
                {quizTaken ? (
                  <div className="py-16 text-center">
                     <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                     </div>
                     <h3 className="text-xl font-bold mb-2">Quiz Completed!</h3>
                     <p className="text-gray-500">You've earned 50 XP for completing today's quiz.</p>
                     <Button variant="secondary" className="mt-8" onClick={() => setQuizTaken(false)}>Review Answers</Button>
                  </div>
                ) : (
                  <QuizView 
                    quiz={classSession.quiz || []}
                    subject={classSession.subject || 'General'}
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
                                 <span className="text-primary font-bold">85%</span>
                              </div>
                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-theme-gradient w-[85%]" />
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
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                         <Zap size={20} />
                      </div>
                      <div>
                         <h3 className="font-bold">AI Learning Twin</h3>
                         <p className="text-xs text-gray-500">Personalized study partner</p>
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
                     <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center ${ann.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        <Bell size={24} />
                     </div>
                     <div>
                        <div className="flex items-center gap-3 mb-1">
                           <h3 className="font-bold">{ann.title}</h3>
                           {ann.priority === 'high' && <Badge variant="danger" size="xs">Priority</Badge>}
                        </div>
                        <p className="text-gray-600 mb-3 leading-relaxed">{ann.content}</p>
                        <p className="text-xs text-gray-400">{new Date(ann.createdAt).toLocaleDateString()} • By {ann.author}</p>
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
                      <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-primary ring-4 ring-primary/10 shadow-2xl">
                         {student.faceImage ? (
                           <img src={student.faceImage} alt="Profile" className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full bg-theme-gradient flex items-center justify-center text-white text-4xl font-black">
                              {student.name[0]}
                           </div>
                         )}
                      </div>
                      <button 
                        onClick={() => setShowFaceRegistration(true)}
                        className="absolute -bottom-2 -right-2 w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-primary hover:scale-110 transition-transform"
                      >
                         <Camera size={20} />
                      </button>
                   </div>
                   <div className="text-center md:text-left flex-1">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                         <h2 className="text-3xl font-black">{student.name}</h2>
                         <Badge variant="streak" size="sm">Top 5%</Badge>
                      </div>
                      <p className="text-gray-500 font-medium mb-4">{student.email} • ID: {student.id}</p>
                      <div className="flex flex-wrap justify-center md:justify-start gap-4">
                         <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Class</p>
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
