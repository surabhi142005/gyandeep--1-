import React, { useState, useMemo } from 'react';
import type { Admin } from '../types';
import { UserRole as UserRoleEnum } from '../types';
import Spinner from './Spinner';
import { t } from '../services/i18n';

interface AdminSetupProps {
  onSetupComplete: (adminData: Omit<Admin, 'faceImage'>) => void;
  theme: string;
}

const THEME_COLORS: Record<string, Record<string, string>> = {
  indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500', border: 'border-indigo-500' },
  teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500', border: 'border-teal-500' },
  crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500', border: 'border-red-500' },
  purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500', border: 'border-purple-500' },
};

const AdminSetup: React.FC<AdminSetupProps> = ({ onSetupComplete, theme }) => {
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim() || !confirmPassword.trim()) {
      setError("All fields are required.");
      return;
    }

    if (adminPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (adminPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    (async () => {
      try {
        const apiBase = (import.meta as any).env?.VITE_API_URL || '';
        // Register via server API so password is bcrypt-hashed in the DB
        // First user is automatically admin
        const res = await fetch(`${apiBase}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword, name: adminName.trim(), role: 'admin' }),
        });
        if (res.ok) {
          const { token, user } = await res.json();
          try { window.localStorage.setItem('gyandeep_token', token); } catch (err) { console.warn('localStorage token save failed', err); }
          const newAdmin: Omit<Admin, 'faceImage'> = {
            id: user.id,
            name: user.name,
            role: UserRoleEnum.ADMIN,
            email: user.email,
            password: adminPassword,
          };
          onSetupComplete(newAdmin);
        } else {
          // Server unavailable — fallback to local-only setup
          const { hashPassword } = await import('../services/authService');
          const hashed = await hashPassword(adminPassword);
          const newAdmin: Omit<Admin, 'faceImage'> = {
            id: 'a1',
            name: adminName.trim(),
            role: UserRoleEnum.ADMIN,
            email: adminEmail.trim(),
            password: hashed,
          };
          onSetupComplete(newAdmin);
        }
      } catch {
        // Server unreachable — fallback to local-only setup
        try {
          const { hashPassword } = await import('../services/authService');
          const hashed = await hashPassword(adminPassword);
          const newAdmin: Omit<Admin, 'faceImage'> = {
            id: 'a1',
            name: adminName.trim(),
            role: UserRoleEnum.ADMIN,
            email: adminEmail.trim(),
            password: hashed,
          };
          onSetupComplete(newAdmin);
        } catch (err: any) {
          setError("Error securing password: " + err.message);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">Gyandeep</h1>
          <p className="text-gray-800 mt-2 font-medium drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">{t('Initial Setup: Create Administrator Account')}</p>
        </div>
        <div className="bg-white rounded-xl shadow-2xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">{t('Administrator Details')}</h2>
          {error && <p className="text-red-600 text-center mb-4 text-sm bg-red-50 p-2 rounded-md">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="adminName" className="sr-only">{t('Full Name')}</label>
              <input
                type="text"
                id="adminName"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                placeholder={t('Full Name')}
                className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="adminEmail" className="sr-only">{t('Email Address')}</label>
              <input
                type="email"
                id="adminEmail"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                placeholder={t('Email Address')}
                className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="adminPassword" className="sr-only">{t('Password')}</label>
              <input
                type="password"
                id="adminPassword"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                placeholder={t('Password (min. 6 characters)')}
                className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">{t('Confirm Password')}</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder={t('Confirm Password')}
                className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full text-white font-bold py-3 rounded-lg transition-colors duration-300 flex items-center justify-center ${colors.primary} ${colors.hover} disabled:opacity-50`}
            >
              {isLoading ? <Spinner /> : t('Create Admin Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
