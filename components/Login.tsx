import * as React from 'react';
import { useState, useMemo } from 'react';
import type { User, UserRole } from '../types';
import { UserRole as UserRoleEnum, ROLE_DISPLAY_NAMES } from '../types';
import WebcamCapture from './WebcamCapture';
import { verifyFace, passwordMatches, hashPassword, login as supabaseLogin, loginWithGoogle } from '../services/authService';
import Spinner from './Spinner';
import { t } from '../services/i18n';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  theme: string;
  onPasswordReset: (email: string, newPassword: string) => boolean;
}

type LoginMethod = 'faceId' | 'emailPassword';

const THEME_COLORS: Record<string, Record<string, string>> = {
  indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500', border: 'border-indigo-500' },
  teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500', border: 'border-teal-500' },
  crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500', border: 'border-red-500' },
  purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500', border: 'border-purple-500' },
};


const Login: React.FC<LoginProps> = ({ onLogin, users, theme, onPasswordReset }) => {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('emailPassword');

  // Face ID Login State
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showWebcam, setShowWebcam] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Email/Password Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Forgot Password State
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'enterEmail' | 'enterCode' | 'resetPassword' | null>(null);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [modalMessage, setModalMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // General State
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  // Users for Face ID login (all users now, searchable)
  const allUsersForLogin = useMemo(() =>
    users.filter(u => u.name && u.id),
    [users]
  );

  const handleForgotPasswordStart = () => {
    setForgotPasswordStep('enterEmail');
    setForgotPasswordEmail(email); // Pre-fill with typed email
    setModalMessage(null);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setError(null);
    if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError(null);
    }
  };


  const handleEmailPasswordLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError(t('Please enter both email and password'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setIsLoggingIn(true);
    try {
      // Try Supabase auth first
      try {
        const { user: authUser } = await supabaseLogin(email, password);
        if (authUser) {
          // Auth state change listener in App.tsx will handle the rest
          return;
        }
      } catch {
        // Supabase not configured or auth failed — fall back to legacy
      }

      // Backend JWT login (always try — vite proxy forwards /api/* to server)
      const apiBase = import.meta.env.VITE_API_URL || '';
      try {
        const res = await fetch(`${apiBase}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (res.ok) {
          const { token, user } = await res.json();
          try { window.localStorage.setItem('gyandeep_token', token); } catch {}
          onLogin(user);
          return;
        }
        const body = await res.json().catch(() => ({}));
        // If 401, throw proper error; otherwise fall through to offline mode
        if (res.status === 401) throw new Error(body.error || 'Invalid credentials');
      } catch (fetchErr: any) {
        if (fetchErr.message && fetchErr.message !== 'Failed to fetch') throw fetchErr;
        // Server unreachable — fall through to offline mode
      }

      // Offline / local-user fallback (when server is not running)
      const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (user && await passwordMatches(password, user.password)) {
        onLogin(user);
      } else {
        setError(t('Invalid email or password'));
      }
    } catch (e: any) {
      setError(e.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFaceLoginRequest = async () => {
    setError(null);
    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) {
      setError('Please select a user.');
      return;
    }
    if (!selectedUser.faceImage) {
      setError('Face ID is not set up for this account. Please use Email & Password login.');
      return;
    }
    setIsRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      stream.getTracks().forEach(track => track.stop());
      setShowWebcam(true);
    } catch {
      setError('Camera access was denied. Please allow camera permissions in your browser settings and try again.');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleFaceCapture = async (imageDataUrl: string) => {
    setShowWebcam(false);
    setIsAuthenticating(true);
    setError(null);
    try {
      const userToLogin = users.find(u => u.id === selectedUserId);
      const result = await verifyFace(imageDataUrl, userToLogin?.faceImage);
      if (result.authenticated && userToLogin) {
        onLogin(userToLogin);
      } else {
        setError('Face not recognized. Make sure you are in good lighting and try again.');
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed. Please try again or use email & password login.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const closeForgotPassword = () => {
    setForgotPasswordStep(null);
    setForgotPasswordEmail('');
    setVerificationCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setModalMessage(null);
  };

  return (
    <>
      {isAuthenticating && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-[100]">
          <Spinner size="w-12 h-12" color={colors.text} />
          <p className={`mt-4 text-xl font-semibold ${colors.text}`}>Authenticating...</p>
        </div>
      )}

      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-4">
              <span className="text-3xl">🕯️</span>
            </div>
            <h1 className={`text-4xl font-bold ${colors.text}`}>Gyandeep</h1>
            <p className="text-gray-500 mt-2 text-sm">AI-Powered Smart Classroom</p>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-2xl p-6 sm:p-8">

            {error && (
              <div role="alert" aria-live="assertive" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Login Method Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-5" role="tablist" aria-label="Login method">
              <button
                role="tab"
                aria-selected={loginMethod === 'emailPassword'}
                onClick={() => { setLoginMethod('emailPassword'); setError(null); }}
                className={`flex-1 py-2 px-4 text-sm font-semibold rounded-md transition-all ${loginMethod === 'emailPassword' ? `${colors.primary} text-white shadow` : 'text-gray-600'
                  }`}
              >
                <span aria-hidden="true">📧 </span>Email & Password
              </button>
              <button
                role="tab"
                aria-selected={loginMethod === 'faceId'}
                onClick={() => { setLoginMethod('faceId'); setError(null); }}
                className={`flex-1 py-2 px-4 text-sm font-semibold rounded-md transition-all ${loginMethod === 'faceId' ? `${colors.primary} text-white shadow` : 'text-gray-600'
                  }`}
              >
                <span aria-hidden="true">📷 </span>Face ID
              </button>
            </div>

            {/* Email & Password */}
            {loginMethod === 'emailPassword' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onKeyDown={e => e.key === 'Enter' && handleEmailPasswordLogin()}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className={`w-full p-3 text-base border ${emailError ? 'border-red-400' : 'border-gray-300'} rounded-xl shadow-sm focus:outline-none focus:ring-2 ${colors.ring}`}
                  />
                  {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(null); }}
                      onKeyDown={e => e.key === 'Enter' && handleEmailPasswordLogin()}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className={`w-full p-3 pr-10 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 ${colors.ring}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleEmailPasswordLogin}
                  disabled={isLoggingIn || !email || !password}
                  className={`w-full text-white font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${colors.primary} ${colors.hover} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoggingIn ? <><Spinner size="w-5 h-5" /><span>Signing in...</span></> : 'Sign In'}
                </button>
                <div className="text-center">
                  <button onClick={handleForgotPasswordStart} className={`text-sm ${colors.text} hover:underline`}>
                    Forgot Password?
                  </button>
                </div>
              </div>
            )}

            {/* Face ID Login */}
            {loginMethod === 'faceId' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="face-user-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Your Account
                  </label>
                  {allUsersForLogin.length > 0 ? (
                    <select
                      id="face-user-select"
                      value={selectedUserId}
                      onChange={e => { setSelectedUserId(e.target.value); setError(null); }}
                      className={`w-full p-3 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 ${colors.ring} bg-white`}
                    >
                      <option value="">-- Select account --</option>
                      {allUsersForLogin.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({ROLE_DISPLAY_NAMES[u.role]}) {u.faceImage ? '✅' : '(no Face ID)'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-xl border">
                      No accounts found. Contact admin.
                    </p>
                  )}
                </div>
                <button
                  onClick={handleFaceLoginRequest}
                  disabled={isRequestingPermission || !selectedUserId}
                  className={`w-full text-white font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${colors.primary} ${colors.hover} disabled:opacity-50 disabled:cursor-not-allowed`}
                  aria-label="Login with Face ID"
                >
                  {isRequestingPermission ? (
                    <><Spinner size="w-5 h-5" /><span>Requesting camera...</span></>
                  ) : (
                    <><span>📷</span><span>Login with Face ID</span></>
                  )}
                </button>
                {selectedUserId && !allUsersForLogin.find(u => u.id === selectedUserId)?.faceImage && (
                  <p className="text-amber-600 text-xs text-center bg-amber-50 p-2 rounded-lg">
                    ⚠️ This account has no Face ID registered. Use Email & Password instead.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showWebcam && (
        <WebcamCapture
          onCapture={handleFaceCapture}
          onClose={() => setShowWebcam(false)}
          theme={theme}
          title="Face Verification"
          buttonText="Verify Identity"
          liveness
        />
      )}

      {/* Forgot Password Modal */}
      {forgotPasswordStep && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative animate-slide-down">
            <button
              onClick={closeForgotPassword}
              disabled={isModalLoading}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl leading-none"
            >
              &times;
            </button>

            {forgotPasswordStep === 'enterEmail' && (
              <form onSubmit={async e => {
                e.preventDefault();
                setModalMessage(null);
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotPasswordEmail)) {
                  setModalMessage({ type: 'error', text: 'Please enter a valid email.' });
                  return;
                }
                setIsModalLoading(true);
                try {
                  const { requestPasswordReset } = await import('../services/dataService');
                  await requestPasswordReset(forgotPasswordEmail);
                  setModalMessage({ type: 'success', text: 'A reset code has been generated. In offline mode, check the browser console.' });
                  setForgotPasswordStep('enterCode');
                } catch (err: any) {
                  setModalMessage({ type: 'error', text: err.message || 'Failed to request reset.' });
                } finally {
                  setIsModalLoading(false);
                }
              }}>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Reset Password</h2>
                <p className="text-gray-500 mb-4 text-sm">Enter your account email to receive a reset code.</p>
                {modalMessage && (
                  <p className={`mb-4 text-sm p-3 rounded-lg ${modalMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {modalMessage.text}
                  </p>
                )}
                <input
                  type="email" value={forgotPasswordEmail}
                  onChange={e => setForgotPasswordEmail(e.target.value)}
                  required placeholder="Email Address" disabled={isModalLoading}
                  className={`w-full p-3 text-base border rounded-xl mb-4 focus:outline-none focus:ring-2 ${colors.ring} disabled:bg-gray-50`}
                />
                <button type="submit" disabled={isModalLoading || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotPasswordEmail)}
                  className={`w-full text-white font-bold py-2.5 rounded-xl ${colors.primary} ${colors.hover} flex items-center justify-center disabled:opacity-50`}>
                  {isModalLoading ? <Spinner /> : 'Send Code'}
                </button>
              </form>
            )}

            {forgotPasswordStep === 'enterCode' && (
              <form onSubmit={async e => {
                e.preventDefault();
                setModalMessage(null);
                if (!verificationCode || verificationCode.length !== 6) {
                  setModalMessage({ type: 'error', text: 'Enter a valid 6-digit code.' });
                  return;
                }
                setIsModalLoading(true);
                try {
                  const { verifyPasswordReset } = await import('../services/dataService');
                  await verifyPasswordReset(forgotPasswordEmail, verificationCode);
                  setForgotPasswordStep('resetPassword');
                } catch (err: any) {
                  setModalMessage({ type: 'error', text: err.message || 'Invalid code.' });
                } finally {
                  setIsModalLoading(false);
                }
              }}>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Enter Code</h2>
                <p className="text-gray-500 mb-4 text-sm">
                  A 6-digit code was sent to <strong>{forgotPasswordEmail}</strong>. Check browser console if offline.
                </p>
                {modalMessage && (
                  <p className={`mb-4 text-sm p-3 rounded-lg ${modalMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {modalMessage.text}
                  </p>
                )}
                <input
                  type="text" value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required placeholder="6-digit code" maxLength={6} disabled={isModalLoading}
                  className={`w-full p-3 text-base border rounded-xl mb-4 tracking-widest text-center focus:outline-none focus:ring-2 ${colors.ring} disabled:bg-gray-50`}
                />
                <button type="submit" disabled={isModalLoading || verificationCode.length !== 6}
                  className={`w-full text-white font-bold py-2.5 rounded-xl ${colors.primary} ${colors.hover} flex items-center justify-center disabled:opacity-50`}>
                  {isModalLoading ? <Spinner /> : 'Verify Code'}
                </button>
              </form>
            )}

            {forgotPasswordStep === 'resetPassword' && (
              <form onSubmit={async e => {
                e.preventDefault();
                setModalMessage(null);
                if (newPassword.length < 8) {
                  setModalMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
                  return;
                }
                if (newPassword !== confirmNewPassword) {
                  setModalMessage({ type: 'error', text: 'Passwords do not match.' });
                  return;
                }
                setIsModalLoading(true);
                try {
                  // Hash the new password before storing
                  const hashed = await hashPassword(newPassword);
                  const { completePasswordReset } = await import('../services/dataService');
                  await completePasswordReset(forgotPasswordEmail, hashed);
                  // Also update the in-memory users list via onPasswordReset
                  onPasswordReset(forgotPasswordEmail, hashed);
                  setModalMessage({ type: 'success', text: 'Password updated successfully!' });
                  setTimeout(closeForgotPassword, 1500);
                } catch (err: any) {
                  setModalMessage({ type: 'error', text: err.message || 'Failed to reset password.' });
                } finally {
                  setIsModalLoading(false);
                }
              }}>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Set New Password</h2>
                <p className="text-gray-500 mb-4 text-sm">Create a strong password (min 8 characters).</p>
                {modalMessage && (
                  <p className={`mb-4 text-sm p-3 rounded-lg ${modalMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {modalMessage.text}
                  </p>
                )}
                <div className="space-y-3">
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    required placeholder="New Password (min 8 chars)" disabled={isModalLoading}
                    className={`w-full p-3 text-base border rounded-xl focus:outline-none focus:ring-2 ${colors.ring} disabled:bg-gray-50`} />
                  <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                    required placeholder="Confirm New Password" disabled={isModalLoading}
                    className={`w-full p-3 text-base border rounded-xl focus:outline-none focus:ring-2 ${colors.ring} disabled:bg-gray-50`} />
                </div>
                <button type="submit" disabled={isModalLoading}
                  className={`w-full mt-4 text-white font-bold py-2.5 rounded-xl ${colors.primary} ${colors.hover} flex items-center justify-center disabled:opacity-50`}>
                  {isModalLoading ? <Spinner /> : 'Save New Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
