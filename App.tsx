import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import type { Student, Teacher, AttendanceRecord, ClassSession, PerformanceData, AnyUser, Admin, Coordinates, HistoricalSessionRecord, SubjectConfig, ClassConfig } from './types';
import { UserRole as UserRoleEnum } from './types';
import Login from './components/Login';
import ToastNotification from './components/ToastNotification';
import { getCurrentPosition } from './services/locationService';
import Chatbot from './components/Chatbot';
import { fetchUsers, fetchClasses } from './services/dataService';
import { setLocale, t } from './services/i18n';

import AdminSetup from './components/AdminSetup';
import Spinner from './components/Spinner'; // Import Spinner for Suspense fallback
import UserProfile from './components/UserProfile';
import Enhanced3DBackground from './components/Background3D';
import { websocketService } from './services/websocketService';

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
    const [highContrast, setHighContrast] = useLocalStorage('gyandeep-high-contrast', false);
    const [fontScale, setFontScale] = useLocalStorage('gyandeep-font-scale', 1);
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
    const [showProfile, setShowProfile] = useState(false);

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
        document.documentElement.setAttribute('data-high-contrast', highContrast ? '1' : '0');
    }, [highContrast]);

    useEffect(() => {
        document.documentElement.style.setProperty('--font-scale', String(fontScale));
        document.body.style.fontSize = `${fontScale}rem`;
    }, [fontScale]);

    useEffect(() => {
        fetchUsers().then((users) => {
            if (Array.isArray(users) && users.length > 0) {
                setAllUsers(users)
                setIsSetupComplete(true)
            }
        }).catch(() => { })
        fetchClasses().then((classes) => {
            if (Array.isArray(classes)) {
                setAllClasses(classes)
            }
        }).catch(() => { })
    }, [])

    // Check for login success from Google OAuth redirect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('login_success') === 'true') {
            fetch('http://localhost:3001/api/auth/current_user')
                .then(res => res.json())
                .then(user => {
                    if (user && user.id) {
                        handleLogin(user as AnyUser)
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                })
                .catch(err => console.error("Failed to fetch current user", err));
        }
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

        // Initialize WebSocket connection for real-time features
        websocketService.connect(user.id, user.role);

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
        websocketService.disconnect();
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
                const xpGain = Math.max(1, Math.round(score));
                const badges = Array.isArray(student.badges) ? [...student.badges] : [];
                if (score === 100 && !badges.includes('Perfect 5')) badges.push('Perfect 5');
                if (score >= 80 && !badges.includes('High Score')) badges.push('High Score');
                return { ...student, performance: [...student.performance, newPerformance], xp: (student.xp || 0) + xpGain, badges };
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

    const handleUpdateUser = (updatedUser: AnyUser) => {
        setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        if (currentUser && currentUser.id === updatedUser.id) {
            setCurrentUser(updatedUser);
            if (updatedUser.preferences?.theme && updatedUser.preferences.theme !== theme) {
                setTheme(updatedUser.preferences.theme);
            }
            if (updatedUser.preferences?.highContrast !== undefined && updatedUser.preferences.highContrast !== highContrast) {
                setHighContrast(updatedUser.preferences.highContrast);
            }
        }
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
            return <Login onLogin={handleLogin} users={allUsers} theme={theme} />;
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
            <Enhanced3DBackground />
            {notification && (
                <ToastNotification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
            {currentUser && (
                <>
                    <div className="fixed bottom-2 left-2 z-50 flex flex-col gap-2 bg-white/80 backdrop-blur rounded-md shadow p-2">
                        <label className="text-xs text-gray-700">{t('Theme')}</label>
                        <select aria-label="Theme" value={theme} onChange={e => setTheme(e.target.value)} className="text-xs border border-gray-300 rounded px-1 py-0.5">
                            <option value="indigo">Indigo</option>
                            <option value="teal">Teal</option>
                            <option value="crimson">Crimson</option>
                            <option value="purple">Purple</option>
                        </select>
                        <label className="text-xs text-gray-700">{t('Locale')}</label>
                        <select aria-label="Locale" onChange={e => setLocale(e.target.value as any)} className="text-xs border border-gray-300 rounded px-1 py-0.5">
                            <option value="en">English</option>
                            <option value="hi">Hindi</option>
                            <option value="mr">Marathi</option>
                        </select>
                    </div>
                    <div className="fixed top-2 right-2 z-50 flex items-center gap-2 bg-white/80 backdrop-blur rounded-md shadow p-2">
                        <button
                            onClick={() => setShowProfile(true)}
                            className="p-1 rounded-full hover:bg-gray-200 transition-colors mr-2"
                            title={t('Profile')}
                        >
                            {currentUser.faceImage ? (
                                <img src={currentUser.faceImage} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            )}
                        </button>
                        <label className="text-xs text-gray-700">High Contrast</label>
                        <input type="checkbox" aria-label="Toggle high contrast" checked={!!highContrast} onChange={e => setHighContrast(e.target.checked)} />
                        <label className="text-xs text-gray-700 ml-2">Font Scale</label>
                        <input type="range" aria-label="Adjust font scale" min={0.9} max={1.4} step={0.05} value={Number(fontScale)} onChange={e => setFontScale(Number(e.target.value))} />
                    </div>
                </>
            )}
            {renderContent()}
            {currentUser && <Chatbot theme={theme} userLocation={userLocation} />}
        </>
    );
};

export default App;
