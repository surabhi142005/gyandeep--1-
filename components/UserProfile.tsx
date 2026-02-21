import React, { useState, useEffect } from 'react';
import { User, UserPreferences } from '../types';
import { t } from '../services/i18n';

interface UserProfileProps {
    user: User;
    onUpdateUser: (updatedUser: User) => void;
    onClose: () => void;
    theme: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdateUser, onClose, theme }) => {
    const [name, setName] = useState(user.name);
    const [preferences, setPreferences] = useState<UserPreferences>(user.preferences || {});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const updates = {
                name,
                preferences
            };

            const response = await fetch('http://localhost:3001/api/users/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, updates })
            });

            const data = await response.json();
            if (response.ok) {
                setMessage({ text: 'Profile updated successfully!', type: 'success' });
                // Update local user state
                onUpdateUser({ ...user, ...updates });
                setTimeout(onClose, 1500);
            } else {
                setMessage({ text: data.error || 'Failed to update profile', type: 'error' });
            }
        } catch (error: any) {
            const msg = error instanceof TypeError && error.message === 'Failed to fetch'
                ? 'Unable to connect to the server. Please check your connection.'
                : (error.message || 'Error saving profile');
            setMessage({ text: msg, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
                <div className={`p-4 border-b flex justify-between items-center bg-${theme}-600 text-white`}>
                    <h2 className="text-xl font-bold">{t('User Profile')}</h2>
                    <button onClick={onClose} className="text-white hover:text-gray-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {message && (
                        <div className={`p-3 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('Name')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">{t('Preferences')}</h3>

                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-700">{t('Dark Mode')}</span>
                            <button
                                onClick={() => setPreferences(p => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${preferences.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-700">{t('Notifications')}</span>
                            <button
                                onClick={() => setPreferences(p => ({ ...p, notifications: !p.notifications }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.notifications ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${preferences.notifications ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-gray-700">{t('High Contrast')}</span>
                            <button
                                onClick={() => setPreferences(p => ({ ...p, highContrast: !p.highContrast }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.highContrast ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${preferences.highContrast ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-4 py-2 text-white rounded-md font-medium flex items-center ${saving ? 'bg-indigo-400' : `bg-indigo-600 hover:bg-indigo-700`}`}
                    >
                        {saving && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {t('Save Changes')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
