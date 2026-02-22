import React from 'react';
import Dashboard3D from './Dashboard3D';
import Iridescence from './Iridescence';
import type { AnyUser, Student } from '../types';

interface Dashboard3DWrapperProps {
    currentUser: AnyUser;
    students: Student[];
    theme: string;
    classSession: any;
    onClose?: () => void;
}

const Dashboard3DWrapper: React.FC<Dashboard3DWrapperProps> = ({
    currentUser,
    students,
    theme,
    classSession,
    onClose
}) => {
    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Iridescence Background */}
            <Iridescence color={[0.7, 0.5, 0.9]} mouseReact amplitude={0.2} speed={1.3} />

            {/* Dashboard Content */}
            <div className="relative z-10">
                <Dashboard3D
                    currentUser={currentUser}
                    students={students}
                    theme={theme}
                    classSession={classSession}
                />
            </div>

            {/* Close Button (if onClose provided) */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="fixed top-4 right-4 z-50 w-12 h-12 bg-red-600/90 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all"
                    aria-label="Close 3D view"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
};

export default Dashboard3DWrapper;
