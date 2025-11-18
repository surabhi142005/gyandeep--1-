import React, { useEffect, useMemo } from 'react';

interface ToastNotificationProps {
  message: string;
  type: 'info' | 'success';
  onClose: () => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000); // Auto-close after 5 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  const themeClasses = useMemo(() => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'info':
      default:
        return 'bg-blue-500 text-white';
    }
  }, [type]);

  const icon = useMemo(() => {
     switch (type) {
      case 'success':
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'info':
      default:
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
  }, [type]);

  return (
    <div className={`fixed top-5 right-5 z-[100] max-w-sm p-4 rounded-lg shadow-2xl flex items-center animate-slide-down ${themeClasses}`}>
      {icon}
      <span className="flex-grow text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 font-bold text-lg opacity-70 hover:opacity-100">&times;</button>
    </div>
  );
};

export default ToastNotification;