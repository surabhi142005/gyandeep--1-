import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import type { Student, Teacher, AttendanceRecord, ClassSession, PerformanceData, AnyUser, Admin, Coordinates, HistoricalSessionRecord, SubjectConfig, ClassConfig } from './types';
import { UserRole as UserRoleEnum } from './types';
import Login from './components/Login';
import ToastNotification from './components/ToastNotification';
import { getCurrentPosition } from './services/locationService';
import Chatbot from './components/Chatbot';
import { fetchUsers, fetchClasses } from './services/dataService';

import AdminSetup from './components/AdminSetup'; 
import Spinner from './components/Spinner'; // Import Spinner for Suspense fallback

// Lazy load dashboard components
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./components/StudentDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.default })));

// A custom hook to manage state in localStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// Fix: Add a global declaration for the hypothetical `window.ai` object to resolve TypeScript errors.
declare global {
    interface Window {
        ai?: {
            permissions?: {
                request: (permissions: string[]) => Promise<void>;
            };
        };
    }
}

const App: React.FC = () => {
    // --- Permissions Request on Load ---
    useEffect(() => {
        const requestAppPermissions = async () => {
            try {
                if (window.ai && window.ai.permissions && typeof window.ai.permissions.request === 'function') {
                    await window.ai.permissions.request(['camera', 'geolocation']);
                }
            } catch (error) {
                console.error("Error requesting permissions on load:", error);
            }
        };
        requestAppPermissions();
    }, []);

    // --- State Management ---
    const [theme, setTheme] = useLocalStorage('gyandeep-theme', 'indigo');
    const [allUsers, setAllUsers] = useLocalStorage<AnyUser[]>('gyandeep-users', []);
    const [allSubjects, setAllSubjects] = useLocalStorage<SubjectConfig[]>('gyandeep-subjects', [
        { id: 'math', name: 'Mathematics' },
        { id: 'science', name: 'Science' },
        { id: 'history', name: 'History' },
        { id: 'english', name: 'English' },
    ]);
    const [allClasses, setAllClasses] = useLocalStorage<ClassConfig[]>('gyandeep-classes', []);
    const [isSetupComplete, setIsSetupComplete] = useState(() => allUsers.length > 0);
    const [currentUser, setCurrentUser] = useState<AnyUser | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' } | null>(null);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    
    // State for historical attendance records, moved up to App.tsx
    const [historicalRecords, setHistoricalRecords] = useLocalStorage<HistoricalSessionRecord[]>(`attendanceHistory_${currentUser?.id || 'default'}`, []);

    const students = useMemo(() => allUsers.filter(u => u.role === UserRoleEnum.STUDENT) as Student[], [allUsers]);

    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [classSession, setClassSession] = useState<ClassSession>({
        code: null,
        expiry: null,
        notes: null,
        quiz: null,
        quizPublished: false,
        subject: allSubjects[0]?.name || 'Math', // Default to first subject or 'Math'
        teacherLocation: null,
        attendanceRadius: 100,
    });

    // --- Theme Effect ---
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        fetchUsers().then((users) => {
            if (Array.isArray(users) && users.length > 0) {
                setAllUsers(users)
                setIsSetupComplete(true)
            }
        }).catch(() => {})
        fetchClasses().then((classes) => {
            if (Array.isArray(classes)) {
                setAllClasses(classes)
            }
        }).catch(() => {})
    }, [])
    
    // --- Handlers ---
    const showNotification = (message: string, type: 'info' | 'success' = 'info') => {
        setNotification({ message, type });
    };
    
    const handleAdminSetup = (adminData: Omit<Admin, 'faceImage'>) => {
        const newAdmin: Admin = {
            ...adminData,
            role: UserRoleEnum.ADMIN,
            faceImage: null
        };
        setAllUsers([newAdmin]);
        setIsSetupComplete(true);
    };

    const handleLogin = (user: AnyUser) => {
        setCurrentUser(user);
        if (user.role === UserRoleEnum.TEACHER) {
            const currentStudents = allUsers.filter(u => u.role === UserRoleEnum.STUDENT);
            setAttendance(currentStudents.map(s => ({ studentId: s.id, studentName: s.name, status: 'Absent', timestamp: null })));
            
            const teacherAssignedSubjects = (user as Teacher).assignedSubjects;
            const defaultSubject = allSubjects.find(s => teacherAssignedSubjects.includes(s.id))?.name || (allSubjects.length > 0 ? allSubjects[0].name : 'Math');
            
            setClassSession({ 
                code: null, 
                expiry: null, 
                notes: null, 
                quiz: null, 
                quizPublished: false, 
                subject: defaultSubject, 
                teacherLocation: null, 
                attendanceRadius: 100 
            });
        } else if (user.role === UserRoleEnum.STUDENT) {
             // Reset student-specific states on login if needed
        }

        getCurrentPosition()
            .then(setUserLocation)
            .catch(err => {
                console.error("Could not get user location:", err.message);
                showNotification("Could not get your location. Location-based AI features may be limited.", "info");
            });
    };
    
    const handleLogout = () => {
        setCurrentUser(null);
        setUserLocation(null);
    };

    const handleUpdateSession = (sessionUpdate: Partial<ClassSession>) => {
        setClassSession(prev => ({ ...prev, ...sessionUpdate }));
    };
    
    const handleMarkAttendance = (studentId: string) => {
        setAttendance(prev => prev.map(rec => 
            rec.studentId === studentId 
            ? { ...rec, status: 'Present', timestamp: new Date() } 
            : rec
        ));
    };

    const handleUpdatePerformance = (studentId: string, subject: string, score: number) => {
        const newPerformance: PerformanceData = {
            subject,
            score,
            date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
        };
        setAllUsers(prevUsers => prevUsers.map(user => {
            if (user.id === studentId && user.role === UserRoleEnum.STUDENT) {
                const student = user as Student;
                return { ...student, performance: [...student.performance, newPerformance] };
            }
            return user;
        }));
    };

    const handleUsersUpdate = (newUsers: AnyUser[]) => {
        setAllUsers(newUsers);
    };

    const handleUpdateFaceImage = (userId: string, faceImage: string) => {
        setAllUsers(prevUsers => prevUsers.map(user => 
            user.id === userId ? { ...user, faceImage } : user
        ));
        showNotification("Face ID has been updated successfully!", "success");
    };
    
    const handlePasswordReset = (email: string, newPassword: string): boolean => {
        let userFound = false;
        setAllUsers(prevUsers => prevUsers.map(user => {
            if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
                userFound = true;
                return { ...user, password: newPassword };
            }
            return user;
        }));
        return userFound;
    };


    // --- Render Logic ---
    const renderContent = () => {
        if (!isSetupComplete) {
            return <AdminSetup onSetupComplete={handleAdminSetup} theme={theme} />;
        }

        if (!currentUser) {
            return <Login onLogin={handleLogin} users={allUsers} onPasswordReset={handlePasswordReset} theme={theme} />;
        }

        return (
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                    <Spinner size="w-12 h-12" color="text-gray-600" />
                    <p className="mt-4 text-xl text-gray-700">Loading Dashboard...</p>
                </div>
            }>
                {currentUser.role === UserRoleEnum.TEACHER && (
                    <TeacherDashboard
                        teacher={currentUser as Teacher}
                        students={students}
                        attendance={attendance}
                        classSession={classSession}
                        onUpdateSession={handleUpdateSession}
                        onLogout={handleLogout}
                        theme={theme}
                        onUpdateFaceImage={handleUpdateFaceImage}
                        historicalRecords={historicalRecords}
                        onUpdateHistoricalRecords={setHistoricalRecords}
                        allSubjects={allSubjects} // Pass allSubjects
                        allClasses={allClasses} // Pass allClasses
                    />
                )}
                {currentUser.role === UserRoleEnum.STUDENT && (
                    <StudentDashboard
                        student={allUsers.find(u => u.id === currentUser.id) as Student}
                        classSession={classSession}
                        onMarkAttendance={handleMarkAttendance}
                        onUpdatePerformance={handleUpdatePerformance}
                        onLogout={handleLogout}
                        theme={theme}
                        onShowNotification={showNotification}
                        onUpdateFaceImage={handleUpdateFaceImage}
                        historicalSessions={historicalRecords.filter(rec => rec.notes)}
                    />
                )}
                {currentUser.role === UserRoleEnum.ADMIN && (
                    <AdminDashboard
                        admin={currentUser as Admin}
                        users={allUsers}
                        onUpdateUsers={handleUsersUpdate}
                        onLogout={handleLogout}
                        theme={theme}
                        setTheme={setTheme}
                        onUpdateFaceImage={handleUpdateFaceImage}
                        allSubjects={allSubjects} // Pass allSubjects
                        setAllSubjects={setAllSubjects} // Pass setter for subjects
                        allClasses={allClasses}
                        setAllClasses={setAllClasses}
                    />
                )}
            </Suspense>
        );
    };

    return (
        <>
            {notification && (
                <ToastNotification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
            {renderContent()}
            {currentUser && <Chatbot theme={theme} userLocation={userLocation} />}
        </>
    );
};

export default App;