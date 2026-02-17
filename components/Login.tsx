import * as React from 'react';
import { useState, useMemo } from 'react';
import type { User, UserRole } from '../types';
import { UserRole as UserRoleEnum, ROLE_DISPLAY_NAMES } from '../types';
import WebcamCapture from './WebcamCapture';
import { verifyFace } from '../services/authService';
import Spinner from './Spinner';
import { t } from '../services/i18n';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  theme: string;
}

type LoginMethod = 'faceId' | 'emailPassword';

const THEME_COLORS: Record<string, Record<string, string>> = {
  indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500', border: 'border-indigo-500' },
  teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500', border: 'border-teal-500' },
  crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500', border: 'border-red-500' },
  purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500', border: 'border-purple-500' },
};

const Login: React.FC<LoginProps> = ({ onLogin, users, theme }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRoleEnum.STUDENT);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('faceId');

  // Face ID Login State
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showWebcam, setShowWebcam] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Email/Password Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // General State
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      setResetMessage('Please enter your email address.');
      return;
    }

    if (!validateEmail(resetEmail)) {
      setResetMessage('Please enter a valid email address.');
      return;
    }

    setIsResetting(true);
    setResetMessage(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real app, this would send a reset email
      // For demo purposes, we'll just show a success message
      setResetMessage('Password reset instructions have been sent to your email. Please check your inbox.');
      
      // Clear the form
      setResetEmail('');
    } catch (err) {
      setResetMessage('Failed to send reset email. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setError(null);

    if (newEmail && !validateEmail(newEmail)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError(null);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
    setEmail('');
    setPassword('');
    setSelectedUserId('');
    setLoginMethod('faceId');
  };

  const handleEmailPasswordLogin = async () => {
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoggingIn(true);
    try {
      const user = users.find(u => u.email === email && u.role === selectedRole);
      if (user && user.password === password) {
        onLogin(user);
      } else {
        setError('Invalid email or password');
      }
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFaceLoginRequest = async () => {
    setError(null);
    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) {
      setError("Please enter your User ID.");
      return;
    }
    if (!selectedUser.faceImage) {
      setError("Face ID is not set up for your account. Please contact an administrator.");
      return;
    }

    setIsRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      stream.getTracks().forEach(track => track.stop());
      setShowWebcam(true);
    } catch (err) {
      setError("Camera access denied. Please enable camera permissions.");
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleFaceCapture = async (imageDataUrl: string) => {
    setShowWebcam(false);
    setIsAuthenticating(true);
    setError(null);
    try {
      const result = await verifyFace(imageDataUrl, selectedUserId);
      const userToLogin = users.find(u => u.id === selectedUserId);
      if (result.authenticated && userToLogin) {
        onLogin(userToLogin);
      } else {
        setError('Authentication failed. Face not verified.');
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };






  return (
    <>
      {isAuthenticating && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-[100]">
          <Spinner size="w-12 h-12" color={colors.text} />
          <p className={`mt-4 text-xl font-semibold ${colors.text}`}>Authenticating...</p>
        </div>
      )}
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className={`text-3xl sm:text-4xl font-bold ${colors.text}`}>Gyandeep</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">An AI-Powered Classroom</p>
          </div>
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-6">Select Your Role</h2>
            <div className="flex bg-gray-200 rounded-lg p-1 mb-6 flex-col sm:flex-row">
              {[UserRoleEnum.TEACHER, UserRoleEnum.STUDENT, UserRoleEnum.ADMIN].map(role => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 text-center font-semibold rounded-md transition-all duration-300 text-sm sm:text-base ${selectedRole === role ? `${colors.primary} text-white shadow-lg` : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {ROLE_DISPLAY_NAMES[role]}
                </button>
              ))}
            </div>

            {error && <p className="text-red-600 text-center mb-4 text-sm bg-red-50 p-2 rounded-md">{error}</p>}

            {/* Login Method Toggle */}
            <div className="flex bg-gray-200 rounded-lg p-1 mb-6">
              <button
                onClick={() => { setLoginMethod('faceId'); setError(null); }}
                className={`flex-1 py-2 px-4 text-sm font-semibold rounded-md transition-all ${loginMethod === 'faceId' ? `${colors.primary} text-white shadow-lg` : 'bg-white text-gray-700'
                  }`}
              >
                Face ID
              </button>
              <button
                onClick={() => { setLoginMethod('emailPassword'); setError(null); }}
                className={`flex-1 py-2 px-4 text-sm font-semibold rounded-md transition-all ${loginMethod === 'emailPassword' ? `${colors.primary} text-white shadow-lg` : 'bg-white text-gray-700'
                  }`}
              >
                Email & Password
              </button>
            </div>

            {/* Face ID Login */}
            {loginMethod === 'faceId' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="user-id" className="block text-sm font-medium text-gray-700 mb-1">{t('Enter Your User ID')}</label>
                  <input
                    id="user-id"
                    type="text"
                    value={selectedUserId}
                    onChange={e => {
                      setSelectedUserId(e.target.value.trim().toLowerCase());
                      setError(null);
                    }}
                    placeholder="e.g., s1, t2, a1"
                    className={`w-full p-3 text-base border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`}
                  />
                </div>
                <button onClick={handleFaceLoginRequest} disabled={isRequestingPermission || !selectedUserId} className={`w-full text-white font-bold py-3 rounded-lg transition-colors duration-300 flex items-center justify-center ${colors.primary} ${colors.hover} disabled:opacity-50`} aria-label="Login with Face ID">
                  {isRequestingPermission ? <Spinner /> : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {t('Login with Face ID')}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Email & Password Login */}
            {loginMethod === 'emailPassword' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="your@email.com"
                    className={`w-full p-3 text-base border ${emailError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`}
                  />
                  {emailError && <p className="text-red-600 text-xs mt-1">{emailError}</p>}
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your password"
                    className={`w-full p-3 text-base border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`}
                  />
                </div>
                <button
                  onClick={handleEmailPasswordLogin}
                  disabled={isLoggingIn || !email || !password}
                  className={`w-full text-white font-bold py-3 rounded-lg transition-colors duration-300 flex items-center justify-center ${colors.primary} ${colors.hover} disabled:opacity-50`}
                >
                  {isLoggingIn ? (
                    <>
                      <Spinner size="w-5 h-5 mr-2" />
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowForgotPassword(true)}
                    className={`text-sm ${colors.text} hover:underline`}
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showWebcam && <WebcamCapture onCapture={handleFaceCapture} onClose={() => setShowWebcam(false)} theme={theme} title="Face Verification" buttonText="Verify Identity" liveness />}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Reset Password</h2>
            <p className="text-sm text-gray-600 mb-4">Enter your email address and we'll send you instructions to reset your password.</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full p-3 text-base border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              {resetMessage && (
                <div className={`p-3 rounded-md text-sm ${resetMessage.includes('sent') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resetMessage}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                    setResetMessage(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                  className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${colors.primary} ${colors.hover} disabled:opacity-50`}
                >
                  {isResetting ? 'Sending...' : 'Send Reset Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Login Button */}
      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm mb-4">Or sign in with</p>
        <a
          href="http://localhost:3001/auth/google"
          className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto"
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </a>
      </div>
    </>
  );
};

export default Login;
