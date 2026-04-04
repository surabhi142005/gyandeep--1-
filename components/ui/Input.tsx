import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  success,
  hint,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  className = '',
  id,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-') || Math.random().toString(36).slice(2)}`;

  const getStyles = (): React.CSSProperties => {
    if (error) return { 
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.05)'
    };
    if (success) return { 
      borderColor: '#22C55E',
      backgroundColor: 'rgba(34, 197, 94, 0.05)'
    };
    if (focused) return { 
      borderColor: 'var(--color-primary)',
      boxShadow: '0 0 0 4px var(--color-primary-15)',
      backgroundColor: 'var(--color-surface)'
    };
    return { 
      borderColor: 'var(--color-border)',
      backgroundColor: 'var(--color-surface)'
    };
  };

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--color-text)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div 
            className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-200`}
            style={{ color: focused ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
          >
            {icon}
          </div>
        )}
        <input
          id={inputId}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          className={`
            block rounded-xl border bg-white/80 backdrop-blur-sm
            px-4 py-2.5 text-sm placeholder-gray-400
            transition-all duration-200
            focus:outline-none
            disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
            ${icon && iconPosition === 'left' ? 'pl-10' : ''}
            ${icon && iconPosition === 'right' ? 'pr-10' : ''}
            ${fullWidth ? 'w-full' : ''}
            ${className}
          `}
          style={{
            ...getStyles(),
            color: 'var(--color-text)',
            fontSize: '16px' /* Prevents iOS auto-zoom on focus */
          }}
          {...props}
        />
        {icon && iconPosition === 'right' && (
          <div 
            className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {icon}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {success && !error && (
        <p className="mt-1.5 text-xs text-emerald-500 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </p>
      )}

      {hint && !error && !success && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>
      )}
    </div>
  );
};

export default Input;
