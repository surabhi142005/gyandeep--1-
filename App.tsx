import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import type { Student, Teacher, AnyUser, Admin, SubjectConfig, ClassConfig } from './types';
import { UserRole as UserRoleEnum } from './types';
import Login from './components/Login';
import ToastNotification from './components/ToastNotification';
import type { ToastType } from './components/ToastNotification';
import { fetchUsers, fetchClasses, saveUsers } from './services/dataService';
import { setLocale } from './services/i18n';
import AdminSetup from './components/AdminSetup';
import UserProfile from './components/UserProfile';
import LiquidChrome from './components/LiquidChrome';
import AccessibilityPanel from './components/AccessibilityPanel';
import { SkeletonDashboard } from './components/ui/Skeletons';
import { useThemeEngine } from './hooks/useThemeEngine';
import Header from './components/Header';
import type { Announcement } from './components/AnnouncementBoard';
import { ThemeSwitcher, ToastQueue } from './components/ui';
import ErrorBoundary from './components/ErrorBoundary';
import { RealtimeProvider } from './services/RealtimeProvider';
import { ConnectionStatus, NotificationCenter, NotificationToastList } from './components/realtime';


// Extracted hooks
import { useAuth } from './hooks/useAuth';
import { useClassSession } from './hooks/useClassSession';
import { usePerformance } from './hooks/usePerformance';

// Lazy-loaded heavy components
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./components/StudentDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.default })));
const Chatbot = lazy(() => import('./components/Chatbot'));
const LandingPage = lazy(() => import('./components/LandingPage'));

// ── localStorage helper (preferences only) ─────────────────────────────────────
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch { return initialValue; }
    });
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) { console.error(error); }
    };
    return [storedValue, setValue];
}

// ── App ───────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
    // ── Preferences & UI state (localStorage - user preferences) ─────────────
    const [theme, setTheme] = useLocalStorage('gyandeep-theme', 'cosmic-purple');
    const [highContrast, setHighContrast] = useLocalStorage('gyandeep-high-contrast', false);
    const [fontScale, setFontScale] = useLocalStorage('gyandeep-font-scale', 1);
    const [reducedMotion, setReducedMotion] = useLocalStorage('gyandeep-reduced-motion', false);
    const [screenReaderHints, setScreenReaderHints] = useLocalStorage('gyandeep-screen-reader-hints', false);
    const [voiceEnabled, setVoiceEnabled] = useLocalStorage('gyandeep-voice-enabled', false);
    const [darkMode, setDarkMode] = useLocalStorage('gyandeep-dark-mode', false);
    const [currentLocale, setCurrentLocale] = useState('en');
    const [showProfile, setShowProfile] = useState(false);
    const [showLanding, setShowLanding] = useState(true);
    const [notification, setNotification] = useState<{ message: string; type: ToastType } | null>(null);
    const [showLiquid, setShowLiquid] = useState(false);

    // Delay LiquidChrome to improve LCP
    useEffect(() => {
        const timer = setTimeout(() => setShowLiquid(true), 500);
        return () => clearTimeout(timer);
    }, []);

    // ── App data (from backend API) ───────────────────────────────────────────
    const [allUsers, setAllUsers] = useState<AnyUser[]>([]);
    const [allSubjects, setAllSubjects] = useState<SubjectConfig[]>([
        { id: 'math', name: 'Mathematics' },
        { id: 'science', name: 'Science' },
        { id: 'history', name: 'History' },
        { id: 'english', name: 'English' },
    ]);
    const [allClasses, setAllClasses] = useState<ClassConfig[]>([]);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const students = useMemo(() => allUsers.filter(u => u.role === UserRoleEnum.STUDENT) as Student[], [allUsers]);

    const showNotification = (message: string, type: ToastType = 'info') => setNotification({ message, type });

    // ── Extracted hooks ───────────────────────────────────────────────────────
    const {
        currentUser, userLocation,
        handleLogin: _handleLogin, handleLogout,
        handleUpdateFaceImage, handleUpdateUser, handlePasswordReset,
    } = useAuth({ allUsers, setAllUsers, showNotification });

    const {
        classSession, attendance, historicalRecords, setHistoricalRecords,
        handleUpdateSession, handleMarkAttendance, handleAttendanceUpdate, initTeacherSession, resetSession,
    } = useClassSession({ allUsers, allSubjects, currentUserId: currentUser?.id });

    const { handleUpdatePerformance } = usePerformance({ setAllUsers });

    // ── Theme engine ──────────────────────────────────────────────────────────
    useThemeEngine({ theme, highContrast, fontScale, reducedMotion, darkMode, voiceEnabled, locale: currentLocale });

    // ── Data initialisation from backend API ─────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            try {
                const [users, classes] = await Promise.all([
                    fetchUsers(),
                    fetchClasses()
                ]);
                setAllUsers(users || []);
                setAllClasses(classes || []);
                if (Array.isArray(users) && users.length > 0) {
                    setIsSetupComplete(true);
                }
            } catch (err) {
                console.error('Failed to fetch data from server:', err);
                showNotification('Failed to connect to server. Please ensure backend is running.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // ── Login wrapper (init teacher session on login) ─────────────────────────
    const handleLogin = (user: AnyUser) => {
        _handleLogin(user);
        if (user.role === UserRoleEnum.TEACHER) initTeacherSession(user as Teacher);
    };

    const handleLogoutWithReset = () => {
        handleLogout();
        resetSession();
    };

    // ── Admin setup ───────────────────────────────────────────────────────────
    const handleAdminSetup = async (adminData: Omit<Admin, 'faceImage'>) => {
        const newAdmin: Admin = { ...adminData, role: UserRoleEnum.ADMIN, faceImage: null };
        try {
            await saveUsers([newAdmin]);
        } catch (err) {
            console.error('Failed to save admin to server:', err);
        }
        setAllUsers([newAdmin]);
        setIsSetupComplete(true);
    };

    // ── User management ───────────────────────────────────────────────────────
    const handleUsersUpdate = async (newUsers: AnyUser[]) => {
        setAllUsers(newUsers);
        try {
            await saveUsers(newUsers);
        } catch (err) {
            console.error('Failed to sync users to server:', err);
        }
    };

    // ── Announcements ─────────────────────────────────────────────────────────
    const handlePostAnnouncement = (text: string) => {
        if (!currentUser) return;
        const newAnnouncement: Announcement = {
            id: Date.now().toString(), text,
            author: currentUser.name, timestamp: new Date().toISOString(),
        };
        setAnnouncements(prev => [newAnnouncement, ...prev]);
    };

    // Sync in-memory user list after Login component completes its own password reset flow
    const handlePasswordResetSync = (email: string, hashedPassword: string): boolean => {
        setAllUsers(prev => prev.map(u =>
            u.email?.toLowerCase() === email.toLowerCase() ? { ...u, password: hashedPassword } : u
        ));
        return true;
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const renderDashboard = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Connecting to server...</p>
                    </div>
                </div>
            );
        }
        if (!isSetupComplete) {
            return <AdminSetup onSetupComplete={handleAdminSetup} theme={theme} />;
        }
        if (!currentUser) {
            return <Login onLogin={handleLogin} users={allUsers} theme={theme} onPasswordReset={handlePasswordResetSync} />;
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
                        onLogout={handleLogoutWithReset}
                        theme={theme}
                        onUpdateFaceImage={handleUpdateFaceImage}
                        historicalRecords={historicalRecords}
                        onUpdateHistoricalRecords={setHistoricalRecords}
                        allSubjects={allSubjects}
                        allClasses={allClasses}
                        announcements={announcements}
                        onPostAnnouncement={handlePostAnnouncement}
                        onAttendanceUpdate={handleAttendanceUpdate}
                        onStudentsUpdate={setAllUsers}
                    />
                )}
                {currentUser.role === UserRoleEnum.STUDENT && (() => {
                    const foundStudent = allUsers.find(u => u.id === currentUser.id) as Student | undefined;
                    const safeStudent: Student = foundStudent ?? {
                        ...currentUser,
                        role: UserRoleEnum.STUDENT,
                        performance: (currentUser as any).performance || [],
                        badges: (currentUser as any).badges || [],
                        classId: (currentUser as any).classId || undefined,
                        totalQuizzes: (currentUser as any).totalQuizzes || 0,
                        longestStreak: (currentUser as any).longestStreak || 0,
                    };
                    return (
                        <StudentDashboard
                            student={safeStudent}
                            classSession={classSession}
                            onMarkAttendance={handleMarkAttendance}
                            onUpdatePerformance={handleUpdatePerformance}
                            onLogout={handleLogoutWithReset}
                            theme={theme}
                            onShowNotification={showNotification}
                            onUpdateFaceImage={handleUpdateFaceImage}
                            historicalSessions={historicalRecords.filter(rec => rec.notes)}
                            allStudents={students}
                            announcements={announcements}
                            onUpdateSession={handleUpdateSession}
                        />
                    );
                })()}
                    {currentUser.role === UserRoleEnum.ADMIN && (
                    <AdminDashboard
                        admin={currentUser as Admin}
                        users={allUsers}
                        onUpdateUsers={handleUsersUpdate}
                        onLogout={handleLogoutWithReset}
                        theme={theme}
                        onThemeChange={setTheme}
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

    const showLandingPage = showLanding && !currentUser && isSetupComplete;

    return (
        <ErrorBoundary>
            <RealtimeProvider userId={currentUser?.id} userRole={currentUser?.role}>
            {showLiquid && (
                <LiquidChrome
                    color={currentUser ? [0.62, 0.62, 0.62] : [0.56, 0.56, 0.56]}
                    mouseReact amplitude={currentUser ? 0.15 : 0.1} speed={currentUser ? 1.2 : 1}
                />
            )}
            <div id="main-content" className="relative z-10" role="main">
                {notification && (
                    <ToastNotification
                        message={notification.message}
                        type={notification.type}
                        onClose={() => setNotification(null)}
                    />
                )}
                <NotificationToastList />
                {currentUser && (
                    <>
                        <Header
                            user={currentUser}
                            darkMode={darkMode}
                            onToggleDarkMode={() => setDarkMode(!darkMode)}
                            onShowProfile={() => setShowProfile(true)}
                            onLogout={handleLogoutWithReset}
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
                    renderDashboard()
                )}
                {currentUser && (
                    <Suspense fallback={null}>
                        <Chatbot theme={theme} userLocation={userLocation} />
                    </Suspense>
                )}
                {/* ThemeSwitcher removed - now integrated in each Dashboard */}
                <ToastQueue />
                <NotificationToastList />
                {currentUser && (
                    <div className="fixed top-4 right-4 z-40 safe-area-top">
                        <NotificationCenter />
                    </div>
                )}
                <div className="fixed bottom-4 left-4 z-40 safe-area-bottom">
                    <ConnectionStatus variant="banner" />
                </div>
            </div>
            </RealtimeProvider>
        </ErrorBoundary>
    );
};

export default App;
