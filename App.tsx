import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import type { Student, Teacher, AttendanceRecord, ClassSession, PerformanceData, AnyUser, Admin, Coordinates, HistoricalSessionRecord, SubjectConfig, ClassConfig } from './types';
import { UserRole as UserRoleEnum } from './types';
import Login from './components/Login';
import ToastNotification from './components/ToastNotification';
import type { ToastType } from './components/ToastNotification';
import { getCurrentPosition } from './services/locationService';
import { fetchUsers, fetchClasses } from './services/dataService';
import { websocketService } from './services/websocketService';
import { setLocale, t } from './services/i18n';
import AdminSetup from './components/AdminSetup';
import Spinner from './components/Spinner';
import UserProfile from './components/UserProfile';
import Iridescence from './components/Iridescence';
import AccessibilityPanel from './components/AccessibilityPanel';
import { voiceService } from './services/voiceService';
import type { Announcement } from './components/AnnouncementBoard';
import { SkeletonDashboard } from './components/SkeletonLoader';
import { useThemeEngine } from './hooks/useThemeEngine';
import { supabase } from './services/supabaseClient';
import { getCurrentUser } from './services/authService';
import Header from './components/Header';

// Lazy load dashboard components
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./components/StudentDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.default })));
// Lazy load heavy components
const Dashboard3DWrapper = lazy(() => import('./components/Dashboard3DWrapper'));
const Chatbot = lazy(() => import('./components/Chatbot'));
const LandingPage = lazy(() => import('./components/LandingPage'));

// A custom hook to manage state in localStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
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

const App: React.FC = () => {
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
    const [notification, setNotification] = useState<{ message: string; type: ToastType } | null>(null);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [showProfile, setShowProfile] = useState(false);
    const [reducedMotion, setReducedMotion] = useLocalStorage('gyandeep-reduced-motion', false);
    const [screenReaderHints, setScreenReaderHints] = useLocalStorage('gyandeep-screen-reader-hints', false);
    const [voiceEnabled, setVoiceEnabled] = useLocalStorage('gyandeep-voice-enabled', false);
    const [darkMode, setDarkMode] = useLocalStorage('gyandeep-dark-mode', false);
    const [showLanding, setShowLanding] = useState(true);
    const [announcements, setAnnouncements] = useLocalStorage<Announcement[]>('gyandeep-announcements', []);

    const [historicalRecords, setHistoricalRecords] = useLocalStorage<HistoricalSessionRecord[]>(`attendanceHistory_${currentUser?.id || 'default'}`, []);

    const students = useMemo(() => allUsers.filter(u => u.role === UserRoleEnum.STUDENT) as Student[], [allUsers]);

    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [classSession, setClassSession] = useState<ClassSession>({
        code: null,
        expiry: null,
        notes: null,
        quiz: null,
        quizPublished: false,
        subject: allSubjects[0]?.name || 'Math',
        teacherLocation: null,
        attendanceRadius: 100,
    });

    const [currentLocale, setCurrentLocale] = useState('en');

    // --- Theme & A11y Engine ---
    useThemeEngine({
        theme,
        highContrast,
        fontScale,
        reducedMotion,
        darkMode,
        voiceEnabled,
        locale: currentLocale
    });

    // --- Supabase Auth State Listener ---
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                try {
                    const user = await getCurrentUser();
                    if (user) {
                        handleLogin(user as AnyUser);
                    }
                } catch (e) {
                    console.error('Failed to load user after auth change:', e);
                }
            } else if (event === 'SIGNED_OUT') {
                handleLogout();
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    // --- Data Initialization ---
    useEffect(() => {
        fetchUsers().then((users) => {
            if (Array.isArray(users) && users.length > 0) {
                setAllUsers(users);
                setIsSetupComplete(true);
            }
        }).catch((err) => {
            console.error('Failed to fetch users:', err);
        });
        fetchClasses().then((classes) => {
            if (Array.isArray(classes)) {
                setAllClasses(classes);
            }
        }).catch((err) => {
            console.error('Failed to fetch classes:', err);
        });
    }, []);

    // --- Handlers ---
    const showNotification = (message: string, type: ToastType = 'info') => {
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

        // Connect to Supabase Realtime
        try {
            websocketService.connect(user.id, user.role);
        } catch (e: any) {
            console.warn('Real-time connection partial failure:', e?.message || e);
        }

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
        }

        getCurrentPosition()
            .then(setUserLocation)
            .catch(err => {
                console.error("Could not get user location:", err.message);
                showNotification("Could not get your location. Check your internet connection or enable GPS.", "info");
            });
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setUserLocation(null);
        try { websocketService.disconnect() } catch (e: any) { console.warn('Failed to disconnect websocket', e && e.message ? e.message : e) }
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
            date: new Date().toISOString().split('T')[0]
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

    const handlePostAnnouncement = (text: string) => {
        if (!currentUser) return;
        const newAnnouncement: Announcement = {
            id: Date.now().toString(),
            text,
            author: currentUser.name,
            timestamp: new Date().toISOString(),
        };
        setAnnouncements(prev => [newAnnouncement, ...prev]);
    };

    // --- Render Logic ---
    const renderContent = () => {
        if (!isSetupComplete) {
            return <AdminSetup onSetupComplete={handleAdminSetup} theme={theme} />;
        }

        if (!currentUser) {
            return <Login onLogin={handleLogin} users={allUsers} theme={theme} onPasswordReset={handlePasswordReset} />;
        }

        return (
            <Suspense fallback={<SkeletonDashboard />}>
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
                        allSubjects={allSubjects}
                        allClasses={allClasses}
                        announcements={announcements}
                        onPostAnnouncement={handlePostAnnouncement}
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
                        allStudents={students}
                        announcements={announcements}
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
                        allSubjects={allSubjects}
                        setAllSubjects={setAllSubjects}
                        allClasses={allClasses}
                        setAllClasses={setAllClasses}
                    />
                )}
            </Suspense>
        );
    };

    // Show landing page if not logged in and landing is visible
    const showLandingPage = showLanding && !currentUser && isSetupComplete;

    return (
        <>
            <Iridescence color={currentUser ? [0.6, 0.4, 0.8] : [0.5, 0.6, 0.8]} mouseReact amplitude={currentUser ? 0.15 : 0.1} speed={currentUser ? 1.2 : 1} />
            <div id="main-content" className="relative z-10" role="main">
                {notification && (
                    <ToastNotification
                        message={notification.message}
                        type={notification.type}
                        onClose={() => setNotification(null)}
                    />
                )}
                {currentUser && (
                    <>
                        <Header
                            user={currentUser}
                            darkMode={darkMode}
                            onToggleDarkMode={() => setDarkMode(!darkMode)}
                            onShowProfile={() => setShowProfile(true)}
                            onLogout={handleLogout}
                            theme={theme}
                            onThemeChange={setTheme}
                            locale={currentLocale}
                            onLocaleChange={(loc) => {
                                setCurrentLocale(loc);
                                setLocale(loc as 'en' | 'hi' | 'mr');
                            }}
                        />
                        <AccessibilityPanel
                            highContrast={!!highContrast}
                            setHighContrast={setHighContrast}
                            fontScale={Number(fontScale)}
                            setFontScale={setFontScale}
                            reducedMotion={reducedMotion}
                            setReducedMotion={setReducedMotion}
                            screenReaderHints={screenReaderHints}
                            setScreenReaderHints={setScreenReaderHints}
                            voiceEnabled={voiceEnabled}
                            setVoiceEnabled={setVoiceEnabled}
                            darkMode={darkMode}
                            setDarkMode={setDarkMode}
                            theme={theme}
                        />
                    </>
                )}
                {showProfile && currentUser && (
                    <UserProfile
                        user={currentUser}
                        onUpdateUser={handleUpdateUser}
                        onClose={() => setShowProfile(false)}
                        theme={theme}
                    />
                )}
                {showLandingPage ? (
                    <Suspense fallback={<SkeletonDashboard />}>
                        <LandingPage onGetStarted={() => setShowLanding(false)} theme={theme} />
                    </Suspense>
                ) : (
                    renderContent()
                )}
                {currentUser && (
                    <Suspense fallback={null}>
                        <Chatbot theme={theme} userLocation={userLocation} />
                    </Suspense>
                )}
            </div>
        </>
    );
};

export default App;
