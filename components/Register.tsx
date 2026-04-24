import React, { useMemo, useState } from 'react';
import type { User } from '../types';
import { ROLE_DISPLAY_NAMES, UserRole as UserRoleEnum } from '../types';
import WebcamCapture from './WebcamCapture';
import Spinner from './Spinner';
import { register as registerAccount, registerFace } from '../services/authService';
import { t } from '../services/i18n';

interface RegisterProps {
  onRegister: (user: User) => void;
  theme: string;
  onNavigateToLogin: () => void;
}

type RegisterableRole = UserRoleEnum.STUDENT | UserRoleEnum.TEACHER;

const REGISTERABLE_ROLES: RegisterableRole[] = [UserRoleEnum.STUDENT, UserRoleEnum.TEACHER];

const THEME_COLORS: Record<string, Record<string, string>> = {
  indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500', border: 'border-indigo-500' },
  teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500', border: 'border-teal-500' },
  crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500', border: 'border-red-500' },
  purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500', border: 'border-purple-500' },
};

const normalizeRegisteredUser = (user: any): User => {
  const normalizedRole = (user?.role || UserRoleEnum.STUDENT) as UserRoleEnum;

  return {
    id: user?.id,
    name: user?.name || '',
    email: user?.email || '',
    role: normalizedRole,
    faceImage: user?.faceImage || null,
    active: user?.active !== false,
    xp: user?.xp ?? 0,
    level: user?.level ?? 1,
    coins: user?.coins ?? 0,
    ...(normalizedRole === UserRoleEnum.STUDENT ? {
      performance: Array.isArray(user?.performance) ? user.performance : [],
      badges: Array.isArray(user?.badges) ? user.badges : [],
      classId: user?.classId || undefined,
    } : {}),
    ...(normalizedRole === UserRoleEnum.TEACHER ? {
      assignedSubjects: Array.isArray(user?.assignedSubjects) ? user.assignedSubjects : [],
    } : {}),
  } as User;
};

const Register: React.FC<RegisterProps> = ({ onRegister, theme, onNavigateToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<RegisterableRole>(UserRoleEnum.STUDENT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegisteringFace, setIsRegisteringFace] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  const handleRegister = async () => {
    setError(null);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please complete all fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await registerAccount(email.trim(), password, name.trim(), role);
      setRegisteredUser(normalizeRegisteredUser(user));
    } catch (e: any) {
      setError(e.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFaceCapture = async (imageDataUrl: string) => {
    if (!registeredUser) return;

    setShowWebcam(false);
    setIsRegisteringFace(true);
    setError(null);

    try {
      await registerFace(registeredUser.id, imageDataUrl);
      onRegister({ ...registeredUser, faceImage: imageDataUrl });
    } catch (e: any) {
      setError(e.message || 'Face registration failed. You can skip this step and continue.');
    } finally {
      setIsRegisteringFace(false);
    }
  };

  return (
    <>
      {(isSubmitting || isRegisteringFace) && (
        <div className="fixed inset-0 bg-white/90 flex flex-col items-center justify-center z-[100]">
          <Spinner size="w-12 h-12" color={colors.text} />
          <p className={`mt-4 text-xl font-semibold ${colors.text}`}>
            {isRegisteringFace ? t('Registering Face ID...') : t('Creating account...')}
          </p>
        </div>
      )}

      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white shadow-xl mb-4 backdrop-blur-sm">
              <img src="/logo.png" alt="Gyandeep" className="w-14 h-14 sm:w-18 sm:h-18 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">Gyandeep</h1>
            <p className="text-gray-800 mt-2 text-sm font-medium drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
              {registeredUser ? t('Finish setting up your account') : t('Create your account')}
            </p>
          </div>

          <div className="bg-white shadow-2xl rounded-2xl p-6 sm:p-8 border border-gray-200">
            {error && (
              <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            {!registeredUser ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-1">{t('Full Name')}</label>
                  <input
                    id="register-name"
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(null); }}
                    placeholder={t('Enter your full name')}
                    className={`w-full p-3 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 ${colors.ring}`}
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">{t('Email')}</label>
                  <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="your@email.com"
                    className={`w-full p-3 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 ${colors.ring}`}
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label htmlFor="register-role" className="block text-sm font-medium text-gray-700 mb-1">{t('Role')}</label>
                  <select
                    id="register-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as RegisterableRole)}
                    className={`w-full p-3 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 ${colors.ring} bg-white`}
                  >
                    {REGISTERABLE_ROLES.map((option) => (
                      <option key={option} value={option}>
                        {t(ROLE_DISPLAY_NAMES[option])}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t('Administrator accounts are created during initial setup.')}</p>
                </div>

                <div>
                  <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">{t('Password')}</label>
                  <input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder={t('Minimum 8 characters, uppercase, lowercase, and number')}
                    className={`w-full p-3 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 ${colors.ring}`}
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">{t('Confirm Password')}</label>
                  <input
                    id="register-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                    placeholder={t('Re-enter your password')}
                    className={`w-full p-3 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 ${colors.ring}`}
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={isSubmitting}
                  className={`w-full text-white font-bold py-3 rounded-xl transition-all duration-200 ${colors.primary} ${colors.hover} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {t('Create Account')}
                </button>

                <div className="text-center pt-1">
                  <span className="text-sm text-gray-500">{t('Already have an account?')} </span>
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className={`text-sm font-medium ${colors.text} hover:underline`}
                  >
                    {t('Sign In')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-sm font-semibold text-emerald-700">{t('Account created successfully')}</p>
                  <p className="text-sm text-emerald-600 mt-1">{t('Add Face ID now to enable biometric login.')}</p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <p className="text-sm text-gray-600">{t('Account')}</p>
                  <p className="text-lg font-semibold text-gray-900">{registeredUser.name}</p>
                  <p className="text-sm text-gray-600">{registeredUser.email} • {t(ROLE_DISPLAY_NAMES[registeredUser.role])}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowWebcam(true)}
                  disabled={isRegisteringFace}
                  className={`w-full text-white font-bold py-3 rounded-xl transition-all duration-200 ${colors.primary} ${colors.hover} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {t('Register Face ID')}
                </button>

                <button
                  type="button"
                  onClick={() => onRegister(registeredUser)}
                  className="w-full font-semibold py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  {t('Skip for now')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showWebcam && registeredUser && (
        <WebcamCapture
          onCapture={handleFaceCapture}
          onClose={() => setShowWebcam(false)}
          theme={theme}
          title={t('Register Face ID')}
          buttonText={t('Capture & Register')}
          liveness
        />
      )}
    </>
  );
};

export default Register;
