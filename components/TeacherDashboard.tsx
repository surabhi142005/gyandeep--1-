import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Play, 
  UserCheck, 
  LineChart, 
  HelpCircle, 
  FileText, 
  Bell, 
  BarChart3, 
  LogOut, 
  Settings,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Activity,
  Award,
  BookOpen,
  Share2,
  Download,
  Upload,
  PieChart as PieChartIcon,
  RefreshCw,
  Zap
} from 'lucide-react';
import type { User, PerformanceData, Coordinates, QuizQuestion, HistoricalSessionRecord } from '../types';
import { useQuizWorker } from '../hooks/useQuizWorker';
import { syncCalendar, uploadToDrive, fetchTagPresets, uploadCentralizedNotes, fetchCentralizedNotesCombined } from '../services/dataService';
import { t } from '../services/i18n';
import { getCurrentPosition } from '../services/locationService';
import Spinner from './Spinner';
import PerformanceChart from './PerformanceChart';
import AttendanceChart from './AttendanceChart';
import WebcamCapture from './WebcamCapture';
import { uploadClassNotes } from '../services/dataService';
import { TeacherDashboardProps } from './TeacherDashboardProps';
import AnnouncementBoard from './AnnouncementBoard';
import AnalyticsDashboard from './AnalyticsDashboard';
import GradeBook from './GradeBook';
import TicketPanel from './TicketPanel';
import { useTeacherSession } from '../hooks/useTeacherSession';
import { exportToCSV } from '../services/exportService';
import { websocketService } from '../services/websocketService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DashboardLayout, Card, Button, Badge, Input } from './ui';

const SIDEBAR_ITEMS = [
  { id: 'session', label: 'Session Control', icon: Play },
  { id: 'attendance', label: 'Attendance', icon: UserCheck },
  { id: 'performance', label: 'Performance', icon: LineChart },
  { id: 'quiz', label: 'Quiz Center', icon: HelpCircle },
  { id: 'notes', label: 'Class Notes', icon: FileText },
  { id: 'announcements', label: 'Board', icon: Bell },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
  teacher, students, attendance, classSession, onUpdateSession, 
  onLogout, theme, onUpdateFaceImage, historicalRecords, 
  onUpdateHistoricalRecords, allSubjects, allClasses, 
  announcements = [], onPostAnnouncement 
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

  const [tagPresets, setTagPresets] = useState<Record<string, string[]>>({});
  const [notesText, setNotesText] = useState(classSession.notes || '');
  const [notesTab, setNotesTab] = useState<'session' | 'centralized'>('session');
  const [centralizedNotes, setCentralizedNotes] = useState<any[]>([]);
  const [selectedQuizClass, setSelectedQuizClass] = useState<string>('');
  const [expiryWarning, setExpiryWarning] = useState<string | null>(null);
  
  useEffect(() => { fetchTagPresets().then(setTagPresets).catch((err) => { console.error('Failed to load tag presets:', err); }) }, []);
  useEffect(() => setNotesText(classSession.notes || ''), [classSession.notes]);
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

  const { startSession, endSession, generateCode, exportSession } = useTeacherSession({ classSession, onUpdateSession, historicalRecords, onUpdateHistoricalRecords });

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
    >
      {activeTab === 'session' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2" padding="xl">
               <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Session Control</h2>
                    <p className="text-gray-500">Manage your active classroom session</p>
                  </div>
                  {classSession.isActive ? (
                    <Badge variant="success" size="lg" className="animate-pulse">Live Now</Badge>
                  ) : (
                    <Badge variant="default" size="lg">Inactive</Badge>
                  )}
               </div>

               <div className="space-y-6">
                  {!classSession.isActive ? (
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-700">Select Subject</label>
                        <select 
                          value={selectedSubject} 
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        >
                          <option value="">Choose a subject...</option>
                          {allSubjects.filter(s => teacher.assignedSubjects.includes(s.id)).map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <Button variant="primary" className="w-full h-12 text-lg" onClick={handleStartSession} icon={<Play size={20} />}>
                        Start Live Session
                      </Button>
                    </div>
                  ) : (
                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Attendance Code</p>
                          <div className="flex items-center justify-between">
                             <p className="text-3xl font-black tracking-widest text-primary">{classSession.code || '---'}</p>
                             <Button variant="ghost" size="sm" onClick={handleGenerateCode} loading={isGeneratingCode} icon={<RefreshCw size={14} />} />
                          </div>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Time Remaining</p>
                          <p className="text-2xl font-bold flex items-center gap-2">
                             <Clock className="text-secondary" size={20} />
                             {/* Timer logic would go here */}
                             09:42
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="danger" className="flex-1 h-12" onClick={handleEndSession} icon={<XCircle size={18} />}>
                          End Session
                        </Button>
                        <Button variant="secondary" className="flex-1 h-12" onClick={() => exportSession()} icon={<Download size={18} />}>
                          Export Report
                        </Button>
                      </div>
                    </div>
                  )}
               </div>
            </Card>

            <Card padding="lg" className="h-fit">
               <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <MapPin className="text-primary" size={20} />
                 Location & Safety
               </h3>
               <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-bold text-gray-500 mb-2">Current Coordinates</p>
                    <p className="text-sm font-medium">
                      {classSession.lat && classSession.lng ? 
                        `${classSession.lat.toFixed(4)}, ${classSession.lng.toFixed(4)}` : 
                        'Location not set'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-bold text-gray-500 mb-2">Attendance Radius</p>
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
                   <p className="text-sm font-medium text-gray-500">Present Today</p>
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
                   <p className="text-sm font-medium text-gray-500">Quizzes Taken</p>
                   <p className="text-2xl font-bold">12</p>
                 </div>
               </div>
            </Card>
            <Card padding="md" hover>
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                   <Award size={24} />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-gray-500">Avg. Score</p>
                   <p className="text-2xl font-bold">84%</p>
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
                 <h3 className="text-xl font-bold mb-6">Attendance Trends</h3>
                 <AttendanceChart data={[
                    { date: 'Mon', present: 24 },
                    { date: 'Tue', present: 28 },
                    { date: 'Wed', present: 26 },
                    { date: 'Thu', present: 30 },
                    { date: 'Fri', present: 22 },
                 ]} />
              </Card>
              <Card padding="lg">
                 <h3 className="text-lg font-bold mb-4">Quick Stats</h3>
                 <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                       <p className="text-xs font-bold text-green-600 uppercase">Weekly Average</p>
                       <p className="text-2xl font-black text-green-700">92%</p>
                    </div>
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                       <p className="text-xs font-bold text-orange-600 uppercase">Lowest Turnout</p>
                       <p className="text-2xl font-black text-orange-700">Friday (22)</p>
                    </div>
                 </div>
              </Card>
           </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card padding="xl">
              <h3 className="text-xl font-bold mb-6">Class Performance Overview</h3>
              <PerformanceChart data={[
                 { date: 'Unit 1', score: 75 },
                 { date: 'Unit 2', score: 82 },
                 { date: 'Unit 3', score: 78 },
                 { date: 'Unit 4', score: 88 },
                 { date: 'Unit 5', score: 91 },
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
                 <h3 className="text-xl font-bold mb-2">AI Quiz Generator</h3>
                 <p className="text-gray-500 mb-6">Generate assessment questions instantly using Google Gemini AI.</p>
                 <div className="space-y-4">
                    <Input placeholder="Enter topic or paste content..." />
                    <Button variant="primary" className="w-full">Generate 10 Questions</Button>
                 </div>
              </Card>
              <Card padding="xl">
                 <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-6">
                    <HelpCircle size={24} />
                 </div>
                 <h3 className="text-xl font-bold mb-2">Live Quiz Control</h3>
                 <p className="text-gray-500 mb-6">Monitor student progress in real-time during a live quiz.</p>
                 <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-400 font-medium">No quiz active</p>
                 </div>
              </Card>
           </div>
        </div>
      )}

      <TicketPanel userId={teacher.id} role="teacher" />
      
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
