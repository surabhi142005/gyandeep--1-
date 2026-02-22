import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { User, PerformanceData, Coordinates, QuizQuestion, HistoricalSessionRecord } from '../types';
import { generateQuizFromNotes } from '../services/geminiService';
import { fetchQuestionBank, upsertQuizToBank, syncCalendar, uploadToDrive, fetchTagPresets } from '../services/dataService';
import { t } from '../services/i18n';
import { getCurrentPosition } from '../services/locationService';
import Spinner from './Spinner';
import PerformanceChart from './PerformanceChart';
import AttendanceChart from './AttendanceChart';
import WebcamCapture from './WebcamCapture';
import { uploadClassNotes } from '../services/dataService';
import { TeacherDashboardProps } from './TeacherDashboardProps';
import AnnouncementBoard from './AnnouncementBoard';
import { useTeacherSession } from '../hooks/useTeacherSession';
import { exportToCSV } from '../services/exportService';

const CODE_DURATION = 10 * 60; // 10 minutes in seconds

const THEME_COLORS: Record<string, Record<string, string>> = {
  indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-800', ring: 'focus:ring-indigo-500', border: 'focus:border-indigo-500', lightBg: 'bg-indigo-50', lightText: 'text-indigo-700', lightHover: 'hover:bg-indigo-100', accent: 'accent-indigo-600' },
  teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-800', ring: 'focus:ring-teal-500', border: 'focus:border-teal-500', lightBg: 'bg-teal-50', lightText: 'text-teal-700', lightHover: 'hover:bg-teal-100', accent: 'accent-teal-600' },
  crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-800', ring: 'focus:ring-red-500', border: 'focus:border-red-500', lightBg: 'bg-red-50', lightText: 'text-red-700', lightHover: 'hover:bg-red-100', accent: 'accent-red-600' },
  purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-800', ring: 'focus:ring-purple-500', border: 'focus:border-purple-500', lightBg: 'bg-purple-50', lightText: 'text-purple-700', lightHover: 'hover:bg-purple-100', accent: 'accent-purple-600' },
};

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacher, students, attendance, classSession, onUpdateSession, onLogout, theme, onUpdateFaceImage, historicalRecords, onUpdateHistoricalRecords, allSubjects, allClasses, announcements = [], onPostAnnouncement }) => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>(
    classSession.subject || (teacher.assignedSubjects.length > 0 ? allSubjects.find(s => s.id === teacher.assignedSubjects[0])?.name || '' : '')
  );
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [attendanceRadius, setAttendanceRadius] = useState(100);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
  const [expiryWarning, setExpiryWarning] = useState<string | null>(null);
  useEffect(() => { fetchTagPresets().then(setTagPresets).catch((err) => { console.error('Failed to load tag presets:', err); }) }, []);
  useEffect(() => setNotesText(classSession.notes || ''), [classSession.notes]);
  const fallbackPresets: Record<string, string[]> = {
    Mathematics: ['algebra', 'geometry', 'trigonometry', 'calculus', 'practice'],
    Science: ['physics', 'chemistry', 'biology', 'lab', 'experiment'],
    History: ['timeline', 'event', 'figure', 'cause', 'effect'],
    English: ['grammar', 'vocabulary', 'reading', 'writing', 'comprehension']
  };
  const tagOptions = useMemo(() => (tagPresets[selectedSubject] || fallbackPresets[selectedSubject] || ['revision', 'exam', 'homework', 'unit']), [selectedSubject, tagPresets]);

  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  const notify = (title: string, body: string) => {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') new Notification(title, { body });
        });
      }
    } catch (err) {
      console.error('Notification error:', err);
    }
  };
  const prevAttendance = usePrevious(attendance);

  // Filter subjects based on teacher's assigned subjects
  const availableSubjects = useMemo(() => {
    return allSubjects.filter(subject => teacher.assignedSubjects.includes(subject.id));
  }, [allSubjects, teacher.assignedSubjects]);

  useEffect(() => {
    if (prevAttendance) {
      const updatedRecord = attendance.find(currentRec => {
        const prevRec = prevAttendance.find(pr => pr.studentId === currentRec.studentId);
        return prevRec && prevRec.status === 'Absent' && currentRec.status === 'Present';
      });
      if (updatedRecord) {
        setJustUpdatedStudentId(updatedRecord.studentId);
        const timer = setTimeout(() => setJustUpdatedStudentId(null), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [attendance, prevAttendance]);

  // Removed local storage loading for historicalRecords, now managed by App.tsx
  // useEffect(() => {
  //   const savedRecordsRaw = localStorage.getItem(`attendanceHistory_${teacher.id}`);
  //   if (savedRecordsRaw) {
  //     try {
  //       const parsedRecords = JSON.parse(savedRecordsRaw);
  //       if (Array.isArray(parsedRecords)) {
  //         setHistoricalRecords(parsedRecords);
  //       }
  //     } catch (error) {
  //       console.error("Failed to parse historical attendance records from localStorage:", error);
  //       localStorage.removeItem(`attendanceHistory_${teacher.id}`);
  //     }
  //   }
  // }, [teacher.id]);

  // FIX: Add explicit types for the accumulator and initial value in the reduce function
  // to prevent TypeScript from inferring 'acc' and 'data' as 'unknown'. This resolves
  // errors when accessing properties on the calculated summary object.
  const summaryBySubject = useMemo(() => {
    type SubjectSummary = Record<string, {
      totalSessions: number;
      totalPresent: number;
      totalPossible: number;
      averageAttendance?: number;
    }>;

    const subjectData = historicalRecords.reduce((acc: SubjectSummary, record) => {
      const subject = record.subject;
      if (!acc[subject]) {
        acc[subject] = { totalSessions: 0, totalPresent: 0, totalPossible: 0 };
      }
      acc[subject].totalSessions += 1;
      acc[subject].totalPresent += record.attendance.filter(r => r.status === 'Present').length;
      acc[subject].totalPossible += record.attendance.length;
      return acc;
    }, {} as SubjectSummary);

    Object.values(subjectData).forEach((data) => {
      data.averageAttendance = (data.totalPossible > 0)
        ? (data.totalPresent / data.totalPossible) * 100
        : 0;
    });
    return subjectData;
  }, [historicalRecords]);

  // const subjects = ['Math', 'Science', 'History', 'English']; // Replaced by allSubjects
  const clearMessages = () => { setError(null); setSuccessMessage(null); };

  // --- Session Management Hook ---
  const {
    timeLeft,
    isFetchingLocation,
    teacherLocation,
    setTeacherLocation,
    fetchCurrentLocation,
    generateCode
  } = useTeacherSession({
    classSession,
    onUpdateSession,
    duration: CODE_DURATION
  });

  // Warn teacher before session expires
  useEffect(() => {
    if (timeLeft === 120) {
      setExpiryWarning('⚠️ Session code expires in 2 minutes!');
      notify('Session Expiring', 'Your session code expires in 2 minutes.');
    } else if (timeLeft === 60) {
      setExpiryWarning('🚨 Session code expires in 1 minute!');
      notify('Session Expiring Soon', 'Your session code expires in 1 minute.');
    } else if (timeLeft <= 0) {
      setExpiryWarning(null);
    }
  }, [timeLeft]);

  const handleFetchCurrentLocation = async () => {
    clearMessages();
    try {
      const location = await fetchCurrentLocation();
      setManualLat(location.lat.toString());
      setManualLng(location.lng.toString());
      setSuccessMessage("Current location fetched successfully.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetManualLocation = () => {
    clearMessages();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Invalid coordinates.");
      return;
    }
    setTeacherLocation({ lat, lng });
    setSuccessMessage("Manual location set.");
  };

  const saveCurrentSessionToHistory = useCallback(() => {
    if (classSession.code && students.length > 0) {
      const newRecord: HistoricalSessionRecord = {
        id: classSession.expiry ? classSession.expiry - (CODE_DURATION * 1000) : Date.now(),
        date: new Date().toISOString(),
        subject: classSession.subject,
        attendance: attendance,
        notes: classSession.notes, // Include current session notes
        classId: selectedClassFilter !== 'All' ? selectedClassFilter : undefined, // Add class ID to historical record
      };
      const updatedRecords = [newRecord, ...historicalRecords];
      onUpdateHistoricalRecords(updatedRecords); // Use the prop setter
    }
  }, [classSession, attendance, students, historicalRecords, onUpdateHistoricalRecords, classSession.notes, selectedClassFilter]);

  const handleGenerateCode = async () => {
    if (!selectedSubject) {
      setError("Please select a subject first.");
      return;
    }
    if (!teacherLocation) {
      setError("Please set the classroom location first.");
      return;
    }
    saveCurrentSessionToHistory();
    setIsGeneratingCode(true);
    clearMessages();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + CODE_DURATION * 1000;
    onUpdateSession({ code, expiry, teacherLocation, subject: selectedSubject, quiz: null, notes: null, quizPublished: false, attendanceRadius });
    notify('New Class Code', `Code ${code} is active for ${Math.round((expiry - Date.now()) / 60000)} minutes`);
    setIsGeneratingCode(false);
  };

  const handleLogout = () => {
    saveCurrentSessionToHistory();
    onLogout();
  };

  const handleNotesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { setError("File is too large (> 1MB)."); return; }
    if (!['text/plain', 'text/markdown'].includes(file.type)) { setError("Unsupported file format (.txt or .md only)."); return; }

    setIsUploading(true);
    setIsGeneratingQuiz(true);
    clearMessages();

    try {
      const notesText = await file.text();
      if (!notesText.trim()) throw new Error("The uploaded file is empty.");
      onUpdateSession({ notes: notesText, quiz: null, quizPublished: false });
      try {
        const uploaded = await uploadClassNotes({ classId: teacher.id, subjectId: classSession.subject, content: notesText })
        setSuccessMessage(`Notes saved. URL: ${uploaded.url}`)
      } catch (e) {
        console.error('Failed to save notes to server:', e);
      }
      const quiz = await generateQuizFromNotes({
        notesText,
        subject: classSession.subject,
        enableThinkingMode: quizThinkingMode
      });
      try {
        const bank = await fetchQuestionBank();
        const extras = (Array.isArray(bank) ? bank : [])
          .filter(q => (q.subject || '') === classSession.subject)
          .slice(0, Math.max(0, 5 - quiz.length))
          .map(q => ({ id: q.id, question: q.question, options: q.options, correctAnswer: q.correctAnswer }));
        const combined = quiz.concat(extras);
        onUpdateSession({ quiz: combined });
      } catch {
        onUpdateSession({ quiz });
      }
      setSuccessMessage("Quiz is ready for your review.");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploading(false);
      setIsGeneratingQuiz(false);
      event.target.value = '';
    }
  };

  const handlePublishQuiz = async () => {
    setIsPublishingQuiz(true);
    clearMessages();
    try {
      onUpdateSession({ quizPublished: true });
      if (classSession.quiz) {
        await upsertQuizToBank(classSession.quiz, selectedSubject);
      }
      notify('Quiz Published', `Quiz for ${selectedSubject} is now available`);
      setSuccessMessage("Quiz is now live!");
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish quiz');
    } finally {
      setIsPublishingQuiz(false);
    }
  };

  const handleSort = (key: 'studentName' | 'status') => {
    const direction = (sortConfig.key === key && sortConfig.direction === 'ascending') ? 'descending' : 'ascending';
    setSortConfig({ key, direction });
  };

  const handleSubjectChange = (newSubjectName: string) => {
    clearMessages();
    const newSubjectId = allSubjects.find(s => s.name === newSubjectName)?.id || '';

    // Only allow changing if the new subject is assigned to the teacher
    if (!teacher.assignedSubjects.includes(newSubjectId) && newSubjectId !== '') {
      setError(`You are not assigned to teach ${newSubjectName}.`);
      return;
    }

    if (classSession.code && (classSession.notes || classSession.quiz)) {
      if (window.confirm("Changing the subject will clear the current session's notes and quiz. Are you sure?")) {
        setSelectedSubject(newSubjectName);
        onUpdateSession({
          subject: newSubjectName,
          notes: null,
          quiz: null,
          quizPublished: false,
        });
        setSuccessMessage(`Subject changed to ${newSubjectName}. Notes and quiz reset.`);
      }
    } else {
      setSelectedSubject(newSubjectName);
      if (classSession.code) {
        onUpdateSession({ subject: newSubjectName });
      }
    }
  };

  const handleFaceRegister = (imageDataUrl: string) => {
    onUpdateFaceImage(teacher.id, imageDataUrl);
    setShowFaceRegistration(false);
  };

  const handleCopyCode = async () => {
    if (classSession.code) {
      try {
        await navigator.clipboard.writeText(classSession.code);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000); // Hide message after 2 seconds
      } catch (err) {
        console.error('Failed to copy code: ', err);
        setError('Failed to copy code to clipboard.');
      }
    }
  };

  const sortedAndFilteredAttendance = useMemo(() => {
    let records = [...attendance];
    if (filterStatus !== 'All') records = records.filter(rec => rec.status === filterStatus);
    if (selectedClassFilter !== 'All') {
      const studentsInClass = students.filter(s => s.classId === selectedClassFilter).map(s => s.id);
      records = records.filter(rec => studentsInClass.includes(rec.studentId));
    }
    records.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return records;
  }, [attendance, filterStatus, sortConfig, selectedClassFilter, students]);

  const canGenerateSession = useMemo(() => {
    return selectedSubject && teacherLocation && teacher.assignedSubjects.length > 0;
  }, [selectedSubject, teacherLocation, teacher.assignedSubjects.length]);


  return (
    <>
      <div className="min-h-screen">
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          <div>
            <h1 className={`text-2xl font-bold ${colors.text}`}>Teacher Dashboard</h1>
            <p className="text-gray-600">Welcome, {teacher.name}</p>
          </div>
          <button onClick={handleLogout} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">Logout</button>
        </header>

        {/* Session expiry warning toast */}
        {expiryWarning && (
          <div className="sticky top-0 z-40 mx-4 mt-2">
            <div className="bg-amber-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between animate-slide-down">
              <span className="font-semibold text-sm">{expiryWarning}</span>
              <button onClick={() => setExpiryWarning(null)} className="ml-4 text-white/80 hover:text-white text-lg leading-none">&times;</button>
            </div>
          </div>
        )}

        <main className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">My Profile</h2>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-2xl font-bold">
                  {teacher.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-800">{teacher.name}</p>
                  <p className="text-sm text-gray-500">{teacher.email}</p>
                </div>
              </div>
              <div className="mt-4 border-t pt-4">
                <h3 className="text-md font-semibold text-gray-600 mb-2">Face ID</h3>
                {teacher.faceImage ? (
                  <div className="flex items-center space-x-4">
                    <img src={teacher.faceImage} alt="Teacher's face" className="w-12 h-12 rounded-full object-cover" />
                    <p className="text-sm text-green-700 font-medium">Registered</p>
                    <button onClick={() => setShowFaceRegistration(true)} className={`ml-auto text-sm font-semibold ${colors.lightText} ${colors.lightHover} px-3 py-1 rounded-md`}>Update</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Not registered.</p>
                    <button onClick={() => setShowFaceRegistration(true)} className={`text-sm font-semibold ${colors.primary} text-white px-3 py-1 rounded-lg ${colors.hover}`}>Register Now</button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Session Control</h2>
              {error && <p className="text-red-600 bg-red-50 p-3 rounded-md mb-4">{error}</p>}
              {successMessage && <p className="text-green-600 bg-green-50 p-3 rounded-md mb-4">{successMessage}</p>}

              <div className="mb-4">
                <label htmlFor="subject-select" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                {availableSubjects.length > 0 ? (
                  <select
                    id="subject-select"
                    value={selectedSubject}
                    onChange={e => handleSubjectChange(e.target.value)}
                    className={`w-full p-2 border border-gray-300 rounded-md shadow-sm ${colors.ring} ${colors.border}`}
                  >
                    <option value="">-- Select Subject --</option>
                    {availableSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                ) : (
                  <p className="text-sm text-gray-500 p-2 border border-gray-300 rounded-md bg-gray-100">No subjects assigned to you. Contact admin.</p>
                )}
              </div>

              <div className="mb-4 border-t pt-4 mt-4">
                <h3 className="text-md font-semibold text-gray-600 mb-2">Classroom Location</h3>
                {teacherLocation ? (<div className="bg-green-50 text-green-800 p-2 rounded-md text-sm mb-2">Set: {teacherLocation.lat.toFixed(4)}, {teacherLocation.lng.toFixed(4)}</div>) : (<div className="bg-yellow-50 text-yellow-800 p-2 rounded-md text-sm mb-2">Location not set.</div>)}
                <div className="flex gap-2 mb-2">
                  <input type="text" placeholder="Latitude" value={manualLat} onChange={(e) => setManualLat(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md text-sm" />
                  <input type="text" placeholder="Longitude" value={manualLng} onChange={(e) => setManualLng(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <button onClick={handleSetManualLocation} className="w-full text-sm bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 mb-2">Set Manual</button>
                <button onClick={handleFetchCurrentLocation} disabled={isFetchingLocation} className={`w-full text-sm font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center ${colors.lightBg} ${colors.lightText} ${colors.lightHover}`}>
                  {isFetchingLocation ? <Spinner size="w-4 h-4" color={colors.lightText} /> : 'Use GPS Location'}
                </button>
              </div>

              <div className="mb-4 border-t pt-4 mt-4">
                <label htmlFor="radius-slider" className="block text-sm font-medium text-gray-700 mb-2">
                  Attendance Radius: <span className={`font-bold ${colors.text}`}>{attendanceRadius}m</span>
                </label>
                <input
                  id="radius-slider"
                  type="range"
                  min="25"
                  max="500"
                  step="25"
                  value={attendanceRadius}
                  onChange={(e) => setAttendanceRadius(Number(e.target.value))}
                  className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${colors.accent}`}
                />
              </div>

              <button
                onClick={handleGenerateCode}
                disabled={isGeneratingCode || !canGenerateSession}
                className={`w-full text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 flex items-center justify-center ${colors.primary} ${colors.hover} disabled:opacity-50`}
              >
                {isGeneratingCode ? <Spinner /> : classSession.code ? 'End & Start New Session' : 'Generate Session Code'}
              </button>
              {!canGenerateSession && (
                <p className="text-red-600 text-center text-xs mt-2">Select subject and set location to generate code.</p>
              )}
              {classSession.code && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center border-2 border-dashed border-gray-200">
                  <p className="text-gray-600 text-sm font-semibold mb-2">{t('ACTIVE SESSION CODE')}</p>
                  <div className="flex items-center justify-center gap-2 relative">
                    <p className={`text-6xl font-extrabold ${colors.text} tracking-widest my-2`}>{classSession.code}</p>
                    <button
                      onClick={handleCopyCode}
                      className={`p-3 rounded-full ${colors.lightBg} ${colors.lightText} ${colors.lightHover} transition-colors duration-200`}
                      aria-label="Copy code to clipboard"
                      title={t('Copy code')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-2m-6-11h4a2 2 0 012 2v4m-10 4l2 2 4-4" /></svg>
                    </button>
                    {showCopySuccess && (
                      <span className="absolute -top-8 bg-green-500 text-white text-xs px-2 py-1 rounded-md animate-slide-down whitespace-nowrap">{t('Copied to clipboard!')}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{t('Radius')}: {classSession.attendanceRadius}m</p>
                  <div className="relative w-32 h-32 mx-auto my-4">
                    <svg className="w-full h-full" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="#e6e6e6" strokeWidth="12" /><circle cx="60" cy="60" r="50" fill="none" stroke={timeLeft <= 0 ? '#d1d5db' : timeLeft < 60 ? '#ef4444' : timeLeft < 180 ? '#f59e0b' : '#22c55e'} strokeWidth="12" strokeLinecap="round" transform="rotate(-90 60 60)" style={{ strokeDasharray: 2 * Math.PI * 50, strokeDashoffset: (2 * Math.PI * 50) - (timeLeft / CODE_DURATION) * (2 * Math.PI * 50), transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} /></svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">{timeLeft > 0 ? (<><span className="text-2xl font-bold text-gray-700">{`${Math.floor(timeLeft / 60)}`.padStart(2, '0')}:{`${timeLeft % 60}`.padStart(2, '0')}</span><span className="text-xs text-gray-500">{t('left')}</span></>) : (<span className="text-lg font-bold text-red-600">{t('Expired')}</span>)}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('Attendance Summary')}</h2>
              {Object.keys(summaryBySubject).length > 0 ? (
                <div className="space-y-2"><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-2 font-semibold text-gray-600">Subject</th><th className="p-2 font-semibold text-gray-600 text-center">Sessions</th><th className="p-2 font-semibold text-gray-600 text-center">Avg.</th></tr></thead><tbody className="divide-y divide-gray-200">{Object.entries(summaryBySubject).map(([subject, data]) => (<tr key={subject}><td className="p-2 font-medium text-gray-800">{subject}</td><td className="p-2 text-gray-600 text-center">{data.totalSessions}</td><td className="p-2 text-gray-600"><div className="flex items-center justify-center gap-2"><div className="w-full bg-gray-200 rounded-full h-2.5"><div className={`${colors.primary} h-2.5 rounded-full`} style={{ width: `${Math.round(data.averageAttendance || 0)}%` }}></div></div><span className="font-semibold w-10 text-right">{Math.round(data.averageAttendance || 0)}%</span></div></td></tr>))}</tbody></table></div>
              ) : (<p className="text-gray-500 text-sm">No past sessions found.</p>)}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <button onClick={() => setIsHistoryVisible(!isHistoryVisible)} className="w-full text-left p-1 -m-1 rounded-md hover:bg-gray-50 transition-colors">
                <h2 className="text-xl font-semibold text-gray-700 flex justify-between items-center">
                  Historical Attendance
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-gray-400 ${isHistoryVisible ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </h2>
              </button>
              {isHistoryVisible && (
                <div className="mt-4 border-t pt-4 space-y-3 max-h-80 overflow-y-auto pr-2">
                  {historicalRecords.length > 0 ? (
                    historicalRecords.map(record => (
                      <div key={record.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-gray-800">{record.subject}</p>
                          <p className="text-sm font-bold text-gray-600">
                            {record.attendance.filter(a => a.status === 'Present').length} / {record.attendance.length}
                            <span className="font-normal text-gray-500 ml-1">Present</span>
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{new Date(record.date).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">No historical records yet.</p>
                  )}
                </div>
              )}
            </div>

            <AnnouncementBoard
              announcements={announcements}
              onPost={onPostAnnouncement}
              canPost={true}
              theme={theme}
            />

            {classSession.code && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-700">{t('Class Notes & Quiz')}</h2>
                  <div className="flex items-center space-x-2 group relative">
                    <label htmlFor="thinking-mode" className="text-sm font-medium text-gray-600 cursor-pointer">{t('Thinking Mode')}</label>
                    <button
                      onClick={() => setQuizThinkingMode(!quizThinkingMode)}
                      id="thinking-mode"
                      role="switch"
                      aria-checked={quizThinkingMode}
                      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring}`}
                    >
                      <span className={`absolute transition-colors duration-200 ease-in-out w-full h-full rounded-full ${quizThinkingMode ? colors.primary : 'bg-gray-300'}`}></span>
                      <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${quizThinkingMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-800 text-white text-xs rounded py-1 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {t('Enable for higher quality quizzes from complex notes. (Slower)')}
                      <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0" /></svg>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class Notes</label>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Type class notes here..."
                    rows={4}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={async () => {
                      onUpdateSession({ notes: notesText });
                      try {
                        await uploadClassNotes({ classId: teacher.id, subjectId: classSession.subject, content: notesText });
                        setSuccessMessage(`Notes saved.`);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Failed to upload notes');
                      }
                    }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                      Save Notes
                    </button>
                    <button onClick={async () => {
                      if (!notesText.trim()) {
                        setError("Please enter notes first.");
                        return;
                      }
                      setIsGeneratingQuiz(true);
                      clearMessages();
                      try {
                        const quiz = await generateQuizFromNotes({
                          notesText,
                          subject: classSession.subject,
                          enableThinkingMode: quizThinkingMode
                        });
                        try {
                          const bank = await fetchQuestionBank();
                          const extras = (Array.isArray(bank) ? bank : [])
                            .filter(q => (q.subject || '') === classSession.subject)
                            .slice(0, Math.max(0, 5 - quiz.length))
                            .map(q => ({ id: q.id, question: q.question, options: q.options, correctAnswer: q.correctAnswer }));
                          const combined = quiz.concat(extras);
                          onUpdateSession({ quiz: combined });
                        } catch {
                          onUpdateSession({ quiz });
                        }
                        setSuccessMessage("Quiz is ready for your review.");
                      } catch (err: any) {
                        setError(err instanceof Error ? err.message : String(err));
                      } finally {
                        setIsGeneratingQuiz(false);
                      }
                    }} disabled={isGeneratingQuiz} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
                      Generate Quiz
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Or Upload Notes File</label>
                  <input type="file" accept=".txt,.md" onChange={handleNotesUpload} disabled={isUploading || isGeneratingQuiz} className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:${colors.lightBg} file:${colors.lightText} ${colors.lightHover}`} />
                </div>
                {(isUploading || isGeneratingQuiz) && (<div className="mt-4 flex items-center text-gray-600"><Spinner size="w-5 h-5" color={colors.text} /><span className="ml-2">{isUploading ? "Reading..." : `Generating quiz${quizThinkingMode ? ' with Thinking Mode...' : '...'}`}</span></div>)}
              </div>
            )}

            {classSession.quiz && !classSession.quizPublished && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('Review Quiz')}</h2>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2 border-t pt-4">{classSession.quiz.map((q, index) => (
                  <div key={q.id} className="text-sm">
                    <p className="font-semibold text-gray-800">{index + 1}. {q.question}</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">{q.options.map(opt => (
                      <li key={opt} className={`${opt === q.correctAnswer ? 'text-green-700 font-bold' : 'text-gray-600'}`}>{opt} {opt === q.correctAnswer && ' (Correct)'}</li>
                    ))}</ul>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('Difficulty')}</label>
                        <select value={(q as any).difficulty || 'medium'} onChange={e => {
                          const val = e.target.value
                          const updated = (classSession.quiz || []).map(item => item.id === q.id ? { ...item, difficulty: val } : item)
                          onUpdateSession({ quiz: updated })
                        }} className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-gray-600 mb-1">{t('Tags (comma-separated)')}</label>
                        <input type="text" value={Array.isArray((q as any).tags) ? (q as any).tags.join(',') : ''} onChange={e => {
                          const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                          const updated = (classSession.quiz || []).map(item => item.id === q.id ? { ...item, tags: arr } : item)
                          onUpdateSession({ quiz: updated })
                        }} className="w-full px-2 py-1 text-xs border border-gray-300 rounded" />
                        <div className="mt-1 flex flex-wrap gap-2">
                          {tagOptions.map(tag => (
                            <button key={tag} onClick={() => {
                              const current = Array.isArray((q as any).tags) ? (q as any).tags : []
                              if (current.includes(tag)) return
                              const updated = (classSession.quiz || []).map(item => item.id === q.id ? { ...item, tags: [...current, tag] } : item)
                              onUpdateSession({ quiz: updated })
                            }} className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200">
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}</div>
                <button onClick={handlePublishQuiz} disabled={isPublishingQuiz} className="w-full mt-4 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center disabled:bg-green-300">{isPublishingQuiz ? <Spinner size="w-5 h-5" /> : t('Publish Quiz')}</button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('Real-time Attendance')}</h2>
              <div className="grid grid-cols-2 gap-4 mb-4 text-center"><div className="bg-gray-100 p-4 rounded-lg"><p className="text-sm font-medium text-gray-800">Total Students</p><p className="text-3xl font-bold text-gray-600">{students.length}</p></div><div className="bg-green-100 p-4 rounded-lg"><p className="text-sm font-medium text-green-800">Present</p><p className="text-3xl font-bold text-green-600">{attendance.filter(rec => rec.status === 'Present').length}</p></div></div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-sm font-medium text-gray-600">{t('Status')}:</span>
                {(['All', 'Present', 'Absent'] as const).map(status => (<button key={status} onClick={() => setFilterStatus(status)} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${filterStatus === status ? `${colors.primary} text-white shadow` : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{status}</button>))}
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-sm font-medium text-gray-600">{t('Class')}:</span>
                <select
                  value={selectedClassFilter}
                  onChange={e => setSelectedClassFilter(e.target.value)}
                  className={`px-3 py-1 text-xs border-gray-300 rounded-md ${colors.ring} ${colors.border}`}
                >
                  <option value="All">All Classes</option>
                  {allClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50"><tr><th className="p-3"></th><th className="p-3 font-semibold text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('studentName')}>{t('Student Name')} {sortConfig.key === 'studentName' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</th><th className="p-3 font-semibold text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>{t('Status')} {sortConfig.key === 'status' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</th><th className="p-3 font-semibold text-sm text-gray-600">{t('Time')}</th></tr></thead><tbody className="divide-y divide-gray-200">{sortedAndFilteredAttendance.map(rec => (<tr key={rec.studentId} className={`${justUpdatedStudentId === rec.studentId ? 'bg-green-200' : ''} transition-colors duration-500 ease-out`}><td className="p-3"><input type="checkbox" checked={selectedAttendanceIds.includes(rec.studentId)} onChange={e => setSelectedAttendanceIds(prev => e.target.checked ? [...prev, rec.studentId] : prev.filter(id => id !== rec.studentId))} /></td><td className="p-3">{rec.studentName}</td><td className="p-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${rec.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{rec.status}</span></td><td className="p-3 text-sm text-gray-500">{rec.timestamp ? rec.timestamp.toLocaleTimeString() : 'N/A'}</td></tr>))}</tbody></table></div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('Weekly Attendance Trend')}</h2>
              <AttendanceChart data={weeklyAttendance} theme={theme} />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => exportToCSV(
                  [['date', 'present']].concat(weeklyAttendance.map(w => [w.date, String(w.present)])),
                  `attendance_weekly_${new Date().toISOString().slice(0, 10)}.csv`
                )} className={`text-sm px-3 py-1 rounded ${colors.lightText} ${colors.lightHover}`}>
                  {t('Export CSV')}
                </button>
                <button onClick={() => {
                  const rows: string[][] = [['student', 'status', 'time']]
                  sortedAndFilteredAttendance.filter(a => selectedAttendanceIds.includes(a.studentId)).forEach(a => rows.push([a.studentName, a.status, a.timestamp ? a.timestamp.toLocaleTimeString() : 'N/A']))
                  exportToCSV(rows, `attendance_selected_${new Date().toISOString().slice(0, 10)}.csv`)
                }} className={`text-sm px-3 py-1 rounded ${colors.lightText} ${colors.lightHover}`}>
                  {t('Export Selected')}
                </button>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('Student Performance')} ({selectedSubject})</h2>
              <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2">{students.filter(student => selectedClassFilter === 'All' || student.classId === selectedClassFilter).map(student => (<div key={student.id}><div className="flex items-center gap-2 mb-2"><input type="checkbox" checked={selectedPerformanceIds.includes(student.id)} onChange={e => setSelectedPerformanceIds(prev => e.target.checked ? [...prev, student.id] : prev.filter(id => id !== student.id))} /><h3 className="text-lg font-semibold text-gray-600">{student.name}</h3></div><PerformanceChart data={student.performance.filter(p => p.subject === selectedSubject)} title="" theme={theme} /></div>))}</div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => {
                  const rows: string[][] = [['student', 'subject', 'date', 'score']];
                  students.forEach(st => {
                    st.performance.filter(p => !selectedSubject || p.subject === selectedSubject).forEach(p => {
                      rows.push([st.name, p.subject, p.date, String(p.score)]);
                    })
                  });
                  exportToCSV(rows, `performance_${selectedSubject || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`);
                }} className={`text-sm px-3 py-1 rounded ${colors.lightText} ${colors.lightHover}`}>
                  {t('Export CSV')}
                </button>
                <button onClick={() => {
                  const rows: string[][] = [['student', 'subject', 'date', 'score']];
                  students.filter(s => selectedPerformanceIds.includes(s.id)).forEach(st => {
                    st.performance.filter(p => !selectedSubject || p.subject === selectedSubject).forEach(p => {
                      rows.push([st.name, p.subject, p.date, String(p.score)]);
                    })
                  });
                  exportToCSV(rows, `performance_selected_${selectedSubject || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`);
                }} className={`text-sm px-3 py-1 rounded ${colors.lightText} ${colors.lightHover}`}>
                  {t('Export Selected')}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
      {showFaceRegistration && (
        <WebcamCapture
          onCapture={handleFaceRegister}
          onClose={() => setShowFaceRegistration(false)}
          theme={theme}
          title={teacher.faceImage ? "Update Face ID" : "Register Face ID"}
          buttonText="Capture & Save"
        />
      )}
    </>
  );
};

export default TeacherDashboard;