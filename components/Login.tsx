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
  onPasswordReset: (email: string, newPassword: string) => boolean;
  theme: string;
}

type LoginMethod = 'faceId' | 'password';
type ForgotPasswordStep = 'enterEmail' | 'enterCode' | 'resetPassword' | null;

const THEME_COLORS: Record<string, Record<string, string>> = {
    indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500', border: 'border-indigo-500' },
    teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500', border: 'border-teal-500' },
    crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500', border: 'border-red-500' },
    purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500', border: 'border-purple-500' },
};

const Login: React.FC<LoginProps> = ({ onLogin, users, onPasswordReset, theme }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRoleEnum.STUDENT);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('faceId');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);
  
  // UI State
  const [showWebcam, setShowWebcam] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Forgot Password State
  const [forgotPasswordStep, setForgotPasswordStep] = useState<ForgotPasswordStep>(null);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [mockCode, setMockCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [modalMessage, setModalMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);
  const usersForRole = useMemo(() => users.filter(u => u.role === selectedRole), [users, selectedRole]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
    setSelectedUserId(''); // Reset selected user on role change
    // Default to faceId for students, allow choice for others
    if (role === UserRoleEnum.STUDENT) {
        setLoginMethod('faceId');
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
      if (result.authenticated && userToLogin && userToLogin.faceImage) {
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
  
  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setIsLoggingIn(true);
    
    setTimeout(() => { // Simulate network delay
        const userToLogin = users.find(u => u.email?.toLowerCase() === email.toLowerCase() && u.password === password);
        if (userToLogin && userToLogin.role === selectedRole) {
            onLogin(userToLogin);
        } else {
            setError("Invalid email or password for the selected role.");
        }
        setIsLoggingIn(false);
    }, 500);
  };

  const handleForgotPassword = {
    start: () => {
        setForgotPasswordStep('enterEmail');
        setModalMessage(null);
        setForgotPasswordEmail('');
    },
    sendCode: (e: React.FormEvent) => {
        e.preventDefault();
        setModalMessage(null);
        
        if (!validateEmail(forgotPasswordEmail)) {
            setModalMessage({type: 'error', text: 'Please enter a valid email address'});
            return;
        }
        
        setIsModalLoading(true);
        setTimeout(() => {
            const userExists = users.some(u => u.email?.toLowerCase() === forgotPasswordEmail.toLowerCase() && (u.role === UserRoleEnum.ADMIN || u.role === UserRoleEnum.TEACHER));
            if (userExists) {
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                setMockCode(code);
                console.log(`Verification code for ${forgotPasswordEmail}: ${code}`); // For debugging
                setForgotPasswordStep('enterCode');
                setModalMessage({type: 'success', text: 'A verification code has been sent to your email.'});
            } else {
                setModalMessage({type: 'error', text: 'No admin or teacher account found with that email.'});
            }
            setIsModalLoading(false);
        }, 500);
    },
    verifyCode: (e: React.FormEvent) => {
        e.preventDefault();
        setModalMessage(null);
        setIsModalLoading(true);
        setTimeout(() => {
            if (verificationCode === mockCode) {
                setForgotPasswordStep('resetPassword');
            } else {
                setModalMessage({type: 'error', text: 'Invalid verification code.'});
            }
            setIsModalLoading(false);
        }, 500);
    },
    resetPassword: (e: React.FormEvent) => {
        e.preventDefault();
        setModalMessage(null);
        if (newPassword.length < 6) {
            setModalMessage({type: 'error', text: 'Password must be at least 6 characters.'});
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setModalMessage({type: 'error', text: 'Passwords do not match.'});
            return;
        }
        setIsModalLoading(true);
        setTimeout(() => {
            const success = onPasswordReset(forgotPasswordEmail, newPassword);
            if (success) {
                handleForgotPassword.close();
                setError('Password has been reset successfully. You can now log in with your new password.');
            } else {
                setModalMessage({type: 'error', text: 'An unexpected error occurred.'});
            }
            setIsModalLoading(false);
        }, 500);
    },
    close: () => {
        setForgotPasswordStep(null);
        setForgotPasswordEmail('');
        setVerificationCode('');
        setNewPassword('');
        setConfirmNewPassword('');
        setMockCode('');
    }
  };

  const isPasswordLogin = selectedRole !== UserRoleEnum.STUDENT && loginMethod === 'password';

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
                  className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 text-center font-semibold rounded-md transition-all duration-300 text-sm sm:text-base ${
                    selectedRole === role ? `${colors.primary} text-white shadow-lg` : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {ROLE_DISPLAY_NAMES[role]}
                </button>
              ))}
            </div>

            {selectedRole !== UserRoleEnum.STUDENT && (
                <div className="flex justify-center items-center mb-4 text-sm font-medium">
                    <button onClick={() => setLoginMethod('faceId')} className={`${loginMethod === 'faceId' ? colors.text : 'text-gray-500'}`} aria-label="Use Face ID login">{t('Face ID')}</button>
                    <div className="border-l h-4 mx-3"></div>
                    <button onClick={() => setLoginMethod('password')} className={`${loginMethod === 'password' ? colors.text : 'text-gray-500'}`} aria-label="Use password login">{t('Password')}</button>
                    <div className="border-l h-4 mx-3"></div>
                    <button onClick={() => setLoginMethod('password')} className={`${loginMethod === 'password' ? colors.text : 'text-gray-500'}`} aria-label="Use password login">{t('Password')}</button>
                </div>
            )}

            {error && <p className="text-red-600 text-center mb-4 text-sm bg-red-50 p-2 rounded-md">{error}</p>}
            
            {isPasswordLogin ? (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="sr-only">Email</label>
                        <input 
                          type="email" 
                          id="email" 
                          value={email} 
                          onChange={handleEmailChange} 
                          required 
                          placeholder="Email Address" 
                          className={`w-full p-3 text-base border rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border} ${emailError ? 'border-red-500' : 'border-gray-300'}`} 
                        />
                        {emailError && <p className="text-red-600 text-xs mt-1">{emailError}</p>}
                    </div>
                    <div>
                        <label htmlFor="password-input" className="sr-only">Password</label>
                        <input type="password" id="password-input" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Password" className={`w-full p-3 text-base border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`} />
                    </div>
                    <button type="submit" disabled={isLoggingIn} className={`w-full text-white font-bold py-3 rounded-lg transition-colors duration-300 flex items-center justify-center ${colors.primary} ${colors.hover} disabled:opacity-50`}>
                        {isLoggingIn ? <Spinner /> : 'Login'}
                    </button>
                    <div className="text-center">
                        <button type="button" onClick={handleForgotPassword.start} className={`text-sm ${colors.text} hover:underline`}>Forgot Password?</button>
                    </div>
                </form>
            ) : (
                <div className="space-y-4">
                  {loginMethod === 'faceId' ? (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="user-id-otp" className="block text-sm font-medium text-gray-700 mb-1">{t('Enter Your User ID')}</label>
                        <input id="user-id-otp" type="text" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value.trim().toLowerCase())} placeholder="e.g., s1, t2, a1" className={`w-full p-3 text-base border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`} />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={async () => {
                          setError(null);
                          if (!selectedUserId) { setError('Enter your User ID'); return; }
                          setIsLoggingIn(true);
                          try {
                            const user = users.find(u => u.id === selectedUserId);
                            if (!user) { setError('User not found'); return; }
                            const { sendOtp } = await import('../services/dataService');
                            await sendOtp(selectedUserId);
                          } catch (e: any) {
                            setError(e.message || 'Failed to send OTP');
                          } finally {
                            setIsLoggingIn(false);
                          }
                        }} className={`flex-1 text-white font-bold py-3 rounded-lg transition-colors duration-300 ${colors.primary} ${colors.hover}`} aria-label="Send OTP" disabled={isLoggingIn}>{isLoggingIn ? <Spinner /> : t('Send OTP')}</button>
                        <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} placeholder="6-digit code" maxLength={6} className={`flex-1 p-3 text-base border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`} aria-label="Enter OTP code" />


                        <button onClick={async () => {
                          setError(null);
                          if (!selectedUserId || verificationCode.length !== 6) { setError('Enter a valid 6-digit code'); return; }
                          setIsAuthenticating(true);
                          try {
                            const { verifyOtp } = await import('../services/dataService');
                            const res = await verifyOtp(selectedUserId, verificationCode);
                            if (res.ok) {
                              const user = users.find(u => u.id === selectedUserId);
                              if (user) onLogin(user);
                            }
                          } catch (e: any) {
                            setError(e.message || 'Failed to verify OTP');
                          } finally {
                            setIsAuthenticating(false);
                          }
                        }} className={`flex-1 text-white font-bold py-3 rounded-lg transition-colors duration-300 ${colors.primary} ${colors.hover}`} aria-label="Verify OTP" disabled={isAuthenticating}>{isAuthenticating ? <Spinner /> : t('Verify')}</button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {t('Login with Face ID')}
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
            )}
          </div>
        </div>
      </div>
      {showWebcam && <WebcamCapture onCapture={handleFaceCapture} onClose={() => setShowWebcam(false)} theme={theme} title="Face Verification" buttonText="Verify Identity" liveness />}
      {forgotPasswordStep && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-8 w-full max-w-md relative">
                <button onClick={handleForgotPassword.close} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 disabled:opacity-50" disabled={isModalLoading}>&times;</button>
                {forgotPasswordStep === 'enterEmail' && (
                    <form onSubmit={handleForgotPassword.sendCode}>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Reset Password</h2>
                        <p className="text-gray-600 mb-4 text-sm">Enter your account email to receive a verification code.</p>
                        {modalMessage && <p className={`mb-4 text-sm p-2 rounded-md ${modalMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{modalMessage.text}</p>}
                        <input 
                          type="email" 
                          value={forgotPasswordEmail} 
                          onChange={e => {
                            setForgotPasswordEmail(e.target.value);
                            if (modalMessage) setModalMessage(null);
                          }} 
                          required 
                          placeholder="Email Address" 
                          disabled={isModalLoading} 
                          className={`w-full p-3 text-base border rounded-md mb-4 focus:ring-1 ${colors.ring} ${colors.border} disabled:bg-gray-100 ${!validateEmail(forgotPasswordEmail) && forgotPasswordEmail ? 'border-red-500' : 'border-gray-300'}`} 
                        />
                        <button type="submit" disabled={isModalLoading || !validateEmail(forgotPasswordEmail)} className={`w-full text-white font-bold py-2.5 rounded-lg ${colors.primary} ${colors.hover} flex items-center justify-center disabled:opacity-50`}>
                          {isModalLoading ? <Spinner /> : 'Send Code'}
                        </button>
                    </form>
                )}
                 {forgotPasswordStep === 'enterCode' && (
                    <form onSubmit={handleForgotPassword.verifyCode}>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Enter Code</h2>
                        <p className="text-gray-600 mb-4 text-sm">A 6-digit code was sent to {forgotPasswordEmail}.</p>
                        {modalMessage && <p className={`mb-4 text-sm p-2 rounded-md ${modalMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{modalMessage.text}</p>}
                        <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} required placeholder="6-digit code" maxLength={6} disabled={isModalLoading} className={`w-full p-3 text-base border border-gray-300 rounded-md mb-4 tracking-widest text-center focus:ring-1 ${colors.ring} ${colors.border} disabled:bg-gray-100`} />
                        <button type="submit" disabled={isModalLoading} className={`w-full text-white font-bold py-2.5 rounded-lg ${colors.primary} ${colors.hover} flex items-center justify-center disabled:opacity-50`}>
                           {isModalLoading ? <Spinner /> : 'Verify Code'}
                        </button>
                    </form>
                )}
                {forgotPasswordStep === 'resetPassword' && (
                    <form onSubmit={handleForgotPassword.resetPassword}>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Set New Password</h2>
                        <p className="text-gray-600 mb-4 text-sm">Create a new, strong password.</p>
                        {modalMessage && <p className={`mb-4 text-sm p-2 rounded-md ${modalMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{modalMessage.text}</p>}
                        <div className="space-y-3">
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="New Password" disabled={isModalLoading} className={`w-full p-3 text-base border border-gray-300 rounded-md focus:ring-1 ${colors.ring} ${colors.border} disabled:bg-gray-100`} />
                            <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required placeholder="Confirm New Password" disabled={isModalLoading} className={`w-full p-3 text-base border border-gray-300 rounded-md focus:ring-1 ${colors.ring} ${colors.border} disabled:bg-gray-100`} />
                        </div>
                        <button type="submit" disabled={isModalLoading} className={`w-full mt-4 text-white font-bold py-2.5 rounded-lg ${colors.primary} ${colors.hover} flex items-center justify-center disabled:opacity-50`}>
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