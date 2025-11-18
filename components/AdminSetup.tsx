import React, { useState, useMemo } from 'react';
import type { Admin } from '../types';
import { UserRole as UserRoleEnum } from '../types';
import Spinner from './Spinner';

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
    // Simulate API call for admin creation
    setTimeout(() => {
      const newAdmin: Omit<Admin, 'faceImage'> = {
        id: 'a1', // Default ID for the first admin
        name: adminName.trim(),
        role: UserRoleEnum.ADMIN,
        email: adminEmail.trim(),
        password: adminPassword.trim(),
      };
      onSetupComplete(newAdmin);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-bold ${colors.text}`}>Gyandeep</h1>
          <p className="text-gray-600 mt-2">Initial Setup: Create Administrator Account</p>
        </div>
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Administrator Details</h2>
          {error && <p className="text-red-600 text-center mb-4 text-sm bg-red-50 p-2 rounded-md">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="adminName" className="sr-only">Full Name</label>
              <input
                type="text"
                id="adminName"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                placeholder="Full Name"
                className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="adminEmail" className="sr-only">Email Address</label>
              <input
                type="email"
                id="adminEmail"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                placeholder="Email Address"
                className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="adminPassword" className="sr-only">Password</label>
              <input
                type="password"
                id="adminPassword"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                placeholder="Password (min. 6 characters)"
                className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm Password"
                className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-1 ${colors.ring} ${colors.border}`}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full text-white font-bold py-3 rounded-lg transition-colors duration-300 flex items-center justify-center ${colors.primary} ${colors.hover} disabled:opacity-50`}
            >
              {isLoading ? <Spinner /> : 'Create Admin Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;