import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Student, ClassSession, HistoricalSessionRecord } from '../types';
import WebcamCapture from './WebcamCapture';
import StudentFaceRegistration from './StudentFaceRegistration';
import { getCurrentPosition, calculateDistance } from '../services/locationService';
import { verifyFace, verifyLocation } from '../services/authService';
import Spinner from './Spinner';
import QuizView from './QuizView';
import PerformanceChart from './PerformanceChart';

interface StudentDashboardProps {
  student: Student;
  classSession: ClassSession;
  onMarkAttendance: (studentId: string) => void;
  onUpdatePerformance: (studentId: string, subject: string, score: number) => void;
  onLogout: () => void;
  onShowNotification: (message: string, type?: 'info' | 'success') => void;
  theme: string;
  onUpdateFaceImage: (studentId: string, faceImage: string) => void;
  historicalSessions: HistoricalSessionRecord[]; // Add this prop
}

const THEME_COLORS: Record<string, Record<string, string>> = {
    indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-800', ring: 'focus:ring-indigo-500', border: 'focus:border-indigo-500' },
    teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-800', ring: 'focus:ring-teal-500', border: 'focus:border-teal-500' },
    crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-800', ring: 'focus:ring-red-500', border: 'focus:border-red-500' },
    purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-800', ring: 'focus:ring-purple-500', border: 'focus:border-purple-500' },
};


const StudentDashboard: React.FC<StudentDashboardProps> = ({ student, classSession, onMarkAttendance, onUpdatePerformance, onLogout, onShowNotification, theme, onUpdateFaceImage, historicalSessions }) => {
  const [code, setCode] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [quizTaken, setQuizTaken] = useState(false);
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  // FIX: Explicitly pass undefined to useRef to satisfy stricter TypeScript rules that require an initial value.
  const prevSessionRef = useRef<ClassSession | undefined>(undefined);
  const [selectedPreviousNoteInfo, setSelectedPreviousNoteInfo] = useState<{ id: number; subject: string; date: string } | null>(null);
  const [selectedPreviousNoteText, setSelectedPreviousNoteText] = useState<string | null>(null);


  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  useEffect(() => {
    setQuizTaken(false);
  }, [classSession.code]);

  // Effect for showing notifications on updates
  useEffect(() => {
    if (prevSessionRef.current) {
      // Check for new notes
      if (!prevSessionRef.current.notes && classSession.notes) {
        // FIX: Explicitly pass the 'info' type to resolve a potential tooling issue with optional arguments.
        onShowNotification("New class notes are available!", 'info');
      }
      // Check for newly published quiz
      if (!prevSessionRef.current.quizPublished && classSession.quizPublished) {
        // FIX: Explicitly pass the 'info' type to resolve a potential tooling issue with optional arguments.
        onShowNotification("A new quiz has been published!", 'info');
      }
    }
    // Update the ref to the current session for the next render
    prevSessionRef.current = classSession;
  }, [classSession, onShowNotification]);
  
  const handleAttendanceAttempt = async () => {
    setMessage(null);
    if (!classSession.code || !classSession.expiry || !classSession.teacherLocation) {
      setMessage({ type: 'error', text: 'The teacher has not started a class session.' });
      return;
    }
    if (Date.now() > classSession.expiry) {
        setMessage({ type: 'error', text: 'The class code has expired.' });
        return;
    }
    if (code !== classSession.code) {
        setMessage({ type: 'error', text: 'Invalid class code.' });
        return;
    }

    setIsVerifying(true);
    setMessage({ type: 'info', text: 'Checking your location...' });
    try {
        const studentLocation = await getCurrentPosition();
        const result = await verifyLocation(studentLocation, classSession.teacherLocation!, classSession.attendanceRadius);
        if (!result.authenticated) {
            throw new Error(`Location check failed. You are ${Math.round(result.distance_m)}m away, outside the ${result.radius_m}m radius.`);
        }
        setMessage({ type: 'info', text: 'Location confirmed. Please verify your face.' });
        setShowWebcam(true);
    } catch (err: any) {
        setMessage({ type: 'error', text: err.message });
    } finally {
        setIsVerifying(false);
    }
  };
  
  const handleCapture = async (imageDataUrl: string) => {
    setShowWebcam(false);
    setIsVerifying(true);
    setMessage({ type: 'info', text: 'Verifying...' });

    try {
      const face = await verifyFace(imageDataUrl);
      if (!face.authenticated) {
        throw new Error('Face verification failed.');
      }
      onMarkAttendance(student.id);
      const studentLocation = await getCurrentPosition();
      const distance = calculateDistance(studentLocation, classSession.teacherLocation!);
      setMessage({ type: 'success', text: `Attendance marked! You are ${Math.round(distance)}m from the classroom.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleQuizSubmit = (score: number) => {
    onUpdatePerformance(student.id, classSession.subject, score);
    setQuizTaken(true);
  };

  const handleFaceRegister = (imageDataUrl: string) => {
    onUpdateFaceImage(student.id, imageDataUrl);
    setShowFaceRegistration(false);
  };

  const studentPerformanceForSubject = student.performance.filter(p => p.subject === classSession.subject);

  // Filter historical sessions with notes for the current subject or general relevant ones
  const availablePreviousNotes = useMemo(() => {
    // Filter by current subject first, then general if none for subject.
    const notesForSubject = historicalSessions
        .filter(session => session.subject === classSession.subject && session.notes)
        .filter(session => {
          // Show notes from sessions where the student's class matches the session's class
          if (student.classId && session.classId) {
            return session.classId === student.classId;
          }
          // If no class info in session, show all notes for the subject
          return true;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

    if (notesForSubject.length > 0) {
        return notesForSubject;
    }

    // If no notes for current subject, show general recent notes (e.g., last 5)
    return historicalSessions
        .filter(session => session.notes)
        .filter(session => {
          // Filter by student's class if available
          if (student.classId && session.classId) {
            return session.classId === student.classId;
          }
          return true;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5); // Show up to 5 most recent notes regardless of subject
  }, [historicalSessions, classSession.subject, student.classId]);

  // Handle selection from dropdown
  const handleSelectPreviousNote = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const sessionId = parseInt(event.target.value, 10);
    if (isNaN(sessionId)) {
        setSelectedPreviousNoteInfo(null);
        setSelectedPreviousNoteText(null);
        return;
    }
    const session = historicalSessions.find(s => s.id === sessionId);
    if (session && session.notes) {
        setSelectedPreviousNoteInfo({ id: session.id, subject: session.subject, date: session.date });
        setSelectedPreviousNoteText(session.notes);
    } else {
        setSelectedPreviousNoteInfo(null);
        setSelectedPreviousNoteText(null);
    }
  };


  return (
    <>
      <div className="min-h-screen">
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          <div>
            <h1 className={`text-2xl font-bold ${colors.text}`}>Student Dashboard</h1>
            <p className="text-gray-600">Hello, {student.name}</p>
          </div>
          <button onClick={onLogout} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">
            Logout
          </button>
        </header>

        <main className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Mark Attendance</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit session code"
                  maxLength={6}
                  className={`flex-grow p-3 border border-gray-300 rounded-md shadow-sm ${colors.ring} ${colors.border}`}
                />
                <button
                  onClick={handleAttendanceAttempt}
                  disabled={isVerifying || code.length !== 6}
                  className={`text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 flex items-center justify-center ${colors.primary} ${colors.hover} disabled:opacity-50`}
                >
                  {isVerifying ? <Spinner /> : 'Submit'}
                </button>
              </div>
              {message && (
                <p className={`mt-4 p-3 rounded-md text-sm ${
                    message.type === 'success' ? 'bg-green-100 text-green-800' : 
                    message.type === 'error' ? 'bg-red-100 text-red-800' : `bg-blue-100 text-blue-800`
                }`}>
                  {message.text}
                </p>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Face Registration</h2>
              <p className="text-gray-600 mb-4">Register your face to enable face-based authentication for attendance.</p>
              <button
                onClick={() => setShowFaceRegistration(true)}
                className={`w-full text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 ${colors.primary} ${colors.hover}`}
              >
                📷 Register Face
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Class Notes (Current Session)</h2>
              {classSession.notes ? (
                <div className="prose max-w-none max-h-80 overflow-y-auto bg-gray-50 p-4 rounded-md">
                  <pre className="whitespace-pre-wrap font-sans">{classSession.notes}</pre>
                </div>
              ) : (
                <p className="text-gray-500">The teacher has not uploaded notes yet for this session.</p>
              )}
            </div>
            
            {/* New section for Previous Notes */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Previous Class Notes</h2>
              {availablePreviousNotes.length > 0 ? (
                <>
                  <label htmlFor="previous-notes-select" className="block text-sm font-medium text-gray-700 mb-2">Select a session's notes:</label>
                  <select
                    id="previous-notes-select"
                    onChange={handleSelectPreviousNote}
                    value={selectedPreviousNoteInfo?.id || ''}
                    className={`w-full p-2 border border-gray-300 rounded-md shadow-sm mb-4 ${colors.ring} ${colors.border}`}
                  >
                    <option value="">-- Select Notes --</option>
                    {availablePreviousNotes.map(session => (
                      <option key={session.id} value={session.id}>
                        {new Date(session.date).toLocaleDateString()} - {session.subject}
                      </option>
                    ))}
                  </select>
                  {selectedPreviousNoteText && selectedPreviousNoteInfo && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                      <p className="text-sm font-semibold text-gray-800 mb-2">Notes from {selectedPreviousNoteInfo.subject} on {new Date(selectedPreviousNoteInfo.date).toLocaleDateString()}</p>
                      <div className="prose max-w-none max-h-60 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{selectedPreviousNoteText}</pre>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-center">No previous notes available yet.</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Account Settings</h2>
              <div className="flex items-center justify-between">
                  <div>
                      <h3 className="text-md font-semibold text-gray-600">Face ID</h3>
                      <p className={`text-sm ${student.faceImage ? 'text-green-700' : 'text-gray-500'}`}>
                          {student.faceImage ? 'Registered' : 'Not registered'}
                      </p>
                  </div>
                  <button onClick={() => setShowFaceRegistration(true)} className={`text-sm font-semibold ${colors.primary} text-white px-4 py-2 rounded-lg ${colors.hover}`}>
                      {student.faceImage ? 'Update Face ID' : 'Register Now'}
                  </button>
              </div>
              {student.faceImage && (
                  <div className="mt-4 border-t pt-4 flex justify-center">
                      <img src={student.faceImage} alt="Student's face" className="w-24 h-24 rounded-full object-cover"/>
                  </div>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Quiz</h2>
                {classSession.quiz && classSession.quizPublished && !quizTaken ? (
                    <QuizView quiz={classSession.quiz} subject={classSession.subject} onSubmit={handleQuizSubmit} theme={theme}/>
                ) : quizTaken ? (
                    <p className="text-green-600 text-center">You have completed the quiz for this session.</p>
                ) : (
                    <p className="text-gray-500 text-center">The quiz is not yet available.</p>
                )}
            </div>
             {/* Always show performance chart for the current subject */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Your Performance in {classSession.subject}</h2>
              {studentPerformanceForSubject.length > 0 ? (
                <PerformanceChart 
                    data={studentPerformanceForSubject} 
                    title="" // Title is already in h2
                    theme={theme}
                />
              ) : (
                <p className="text-gray-500 text-center">No performance data for {classSession.subject} yet.</p>
              )}
            </div>
          </div>
        </main>
      </div>
      {showWebcam && <WebcamCapture onCapture={handleCapture} onClose={() => setShowWebcam(false)} theme={theme} title="Face Verification" buttonText="Verify Identity" />}
      {showFaceRegistration && (
        <StudentFaceRegistration
          userId={student.id}
          onSuccess={() => {
            setShowFaceRegistration(false);
            onShowNotification('Face registered successfully!', 'success');
          }}
          onClose={() => setShowFaceRegistration(false)}
        />
      )}
    </>
  );
};

export default StudentDashboard;