import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, CheckCircle2, XCircle, AlertCircle, Play, Pause, StopCircle, Eye, EyeOff } from 'lucide-react';
import { realtimeClient } from '../services/realtimeClient';
import type { QuizQuestion, Student } from '../types';

interface QuizSubmission {
  studentId: string;
  studentName: string;
  answers: Record<string, string>;
  score: number;
  submittedAt: string;
  questionProgress: number;
}

interface LiveQuizMonitorProps {
  quiz: QuizQuestion[];
  subject: string;
  classId: string;
  students: Student[];
  onQuizEnd: (results: QuizSubmission[]) => void;
  onStudentSelect?: (studentId: string) => void;
  theme?: string;
}

type QuizState = 'waiting' | 'active' | 'paused' | 'ended';

export const LiveQuizMonitor: React.FC<LiveQuizMonitorProps> = ({
  quiz,
  subject,
  classId,
  students,
  onQuizEnd,
  onStudentSelect,
  theme = 'indigo',
}) => {
  const [quizState, setQuizState] = useState<QuizState>('waiting');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const roomName = `quiz:${classId}:${subject}`;
  const totalQuestions = quiz.length;
  const totalTime = quiz.length * 20;

  useEffect(() => {
    if (quizState === 'active' && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [quizState, startTime]);

  const handleSubmission = useCallback((data: QuizSubmission) => {
    setSubmissions(prev => {
      const existing = prev.findIndex(s => s.studentId === data.studentId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = data;
        return updated;
      }
      return [...prev, data];
    });
  }, []);

  const handleProgress = useCallback((data: { studentId: string; question: number; answers: Record<string, string> }) => {
    setSubmissions(prev => {
      const existing = prev.findIndex(s => s.studentId === data.studentId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], questionProgress: data.question + 1 };
        return updated;
      }
      const student = students.find(s => s.id === data.studentId);
      return [...prev, {
        studentId: data.studentId,
        studentName: student?.name || 'Unknown',
        answers: data.answers,
        score: 0,
        submittedAt: '',
        questionProgress: data.question + 1,
      }];
    });
  }, [students]);

  const handleStateChange = useCallback((data: { state: QuizState; question?: number }) => {
    setQuizState(data.state);
    if (data.question !== undefined) {
      setCurrentQuestion(data.question);
    }
  }, []);

  useEffect(() => {
    realtimeClient.connect(`teacher:${Date.now()}`, 'teacher');
    realtimeClient.joinRoom(roomName);
    realtimeClient.subscribe(['quiz_submission', 'quiz_progress', 'quiz_state']);

    const unsubSubmission = realtimeClient.on('quiz_submission', handleSubmission);
    const unsubProgress = realtimeClient.on('quiz_progress', handleProgress);
    const unsubState = realtimeClient.on('quiz_state', handleStateChange);

    return () => {
      unsubSubmission();
      unsubProgress();
      unsubState();
      realtimeClient.leaveRoom(roomName);
    };
  }, [roomName, handleSubmission, handleProgress, handleStateChange]);

  const startQuiz = () => {
    setQuizState('active');
    setStartTime(new Date());
    setElapsedTime(0);
    setCurrentQuestion(0);
    realtimeClient.broadcast(roomName, {
      type: 'quiz_started',
      quiz,
      subject,
      totalTime,
    });
  };

  const pauseQuiz = () => {
    setQuizState('paused');
    realtimeClient.broadcast(roomName, { type: 'quiz_paused' });
  };

  const resumeQuiz = () => {
    setQuizState('active');
    realtimeClient.broadcast(roomName, { type: 'quiz_resumed' });
  };

  const endQuiz = () => {
    setQuizState('ended');
    realtimeClient.broadcast(roomName, { type: 'quiz_ended' });
    onQuizEnd(submissions);
  };

  const advanceQuestion = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1);
      realtimeClient.broadcast(roomName, { type: 'question_changed', question: currentQuestion + 1 });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCompletionRate = () => {
    if (students.length === 0) return 0;
    return Math.round((submissions.length / students.length) * 100);
  };

  const getAverageProgress = () => {
    if (submissions.length === 0) return 0;
    const total = submissions.reduce((sum, s) => sum + (s.questionProgress / totalQuestions) * 100, 0);
    return Math.round(total / submissions.length);
  };

  const getStudentProgress = (studentId: string) => {
    const submission = submissions.find(s => s.studentId === studentId);
    if (!submission) return 0;
    return Math.round((submission.questionProgress / totalQuestions) * 100);
  };

  if (!isExpanded) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors"
      >
        <Users className="w-6 h-6" />
        {submissions.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full text-xs font-bold flex items-center justify-center">
            {submissions.length}
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-white" />
            <div>
              <h3 className="text-lg font-bold text-white">Live Quiz Monitor</h3>
              <p className="text-indigo-200 text-sm">{subject} - {students.length} students</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <EyeOff className="w-4 h-4" />
            </button>
            {quizState !== 'waiting' && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-200" />
            <span className="text-white font-mono">
              {quizState === 'active' ? formatTime(elapsedTime) : '00:00'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span className="text-white font-medium">
              {submissions.length}/{students.length} submitted
            </span>
          </div>
          <div className="flex-1">
            <div className="w-full bg-white/20 rounded-full h-2">
              <motion.div
                className="bg-emerald-400 h-2 rounded-full"
                animate={{ width: `${getCompletionRate()}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {quizState === 'waiting' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
              <Play className="w-8 h-8 text-indigo-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Ready to Start</h4>
            <p className="text-gray-500 mb-6">Start the quiz when all students are ready.</p>
            <Button variant="primary" onClick={startQuiz} className="mx-auto">
              <Play className="w-4 h-4 mr-2" />
              Start Live Quiz
            </Button>
          </div>
        )}

        {quizState === 'active' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Completion"
                value={`${getCompletionRate()}%`}
                color="indigo"
              />
              <StatCard
                icon={<CheckCircle2 className="w-5 h-5" />}
                label="Submitted"
                value={`${submissions.length}/${students.length}`}
                color="emerald"
              />
              <StatCard
                icon={<AlertCircle className="w-5 h-5" />}
                label="In Progress"
                value={`${students.length - submissions.length}`}
                color="amber"
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">
                Question {currentQuestion + 1} of {totalQuestions}
              </span>
              <div className="flex gap-2">
                {quizState === 'active' && (
                  <button
                    onClick={pauseQuiz}
                    className="p-2 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                )}
                {quizState === 'paused' && (
                  <button
                    onClick={resumeQuiz}
                    className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={endQuiz}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                >
                  <StopCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {students.map(student => {
                const submission = submissions.find(s => s.studentId === student.id);
                const progress = getStudentProgress(student.id);
                const isSelected = selectedStudent === student.id;

                return (
                  <motion.div
                    key={student.id}
                    layout
                    onClick={() => {
                      setSelectedStudent(student.id);
                      onStudentSelect?.(student.id);
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{student.name}</span>
                      {submission ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          Submitted
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">{progress}% complete</span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <motion.div
                        className={`h-1.5 rounded-full ${
                          submission ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {quizState === 'paused' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <Pause className="w-8 h-8 text-amber-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Quiz Paused</h4>
            <p className="text-gray-500 mb-6">Students can see the paused state.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={resumeQuiz}>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button variant="danger" onClick={endQuiz}>
                End Quiz
              </Button>
            </div>
          </div>
        )}

        {quizState === 'ended' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Quiz Ended</h4>
            <p className="text-gray-500 mb-2">{submissions.length} submissions received</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">
                Average score: {submissions.length > 0
                  ? Math.round(submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length)
                  : 0}%
              </p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showDetails && selectedStudent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100"
          >
            <StudentDetailView
              submission={submissions.find(s => s.studentId === selectedStudent)}
              quiz={quiz}
              onClose={() => setSelectedStudent(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'indigo' | 'emerald' | 'amber' | 'red';
}> = ({ icon, label, value, color }) => {
  const colorClasses = {
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="p-4 bg-gray-50 rounded-xl">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${colorClasses[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
};

const StudentDetailView: React.FC<{
  submission?: QuizSubmission;
  quiz: QuizQuestion[];
  onClose: () => void;
}> = ({ submission, quiz, onClose }) => {
  if (!submission) {
    return (
      <div className="p-6 text-center text-gray-500">
        No submission data available yet
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-800">Answers - {submission.studentName}</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <XCircle className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-3">
        {quiz.map((q, idx) => {
          const answer = submission.answers[q.id];
          const isCorrect = answer === q.correctAnswer;

          return (
            <div key={q.id} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">
                Q{idx + 1}: {q.question}
              </p>
              <p className={`text-sm ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                Answer: {answer || 'No answer'} {isCorrect ? '✓' : '✗'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Button: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  className?: string;
}> = ({ children, variant = 'primary', onClick, className = '' }) => {
  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default LiveQuizMonitor;
