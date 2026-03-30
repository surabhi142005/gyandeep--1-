import React from 'react';
import { motion } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    text-white
    shadow-lg
    hover:brightness-110 hover:-translate-y-0.5
    active:scale-[0.98]
    transition-all duration-200
  `,
  secondary: `
    bg-transparent border-2
    hover:-translate-y-0.5
    active:scale-[0.98]
    transition-all duration-200
  `,
  ghost: `
    bg-transparent
    hover:bg-[var(--color-bg)]
    transition-all duration-200
  `,
  danger: `
    bg-red-500 text-white
    shadow-lg shadow-red-500/20
    hover:bg-red-600 hover:shadow-red-500/30
    hover:-translate-y-0.5
    active:scale-[0.98]
    transition-all duration-200
  `,
  success: `
    bg-emerald-500 text-white
    shadow-lg shadow-emerald-500/20
    hover:bg-emerald-600 hover:shadow-emerald-500/30
    hover:-translate-y-0.5
    active:scale-[0.98]
    transition-all duration-200
  `,
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5 min-h-[32px]',
  md: 'px-4 py-2 text-sm rounded-xl gap-2 min-h-[40px]',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5 min-h-[48px]',
  xl: 'px-8 py-4 text-lg rounded-2xl gap-3 min-h-[56px]',
};

const getButtonStyles = (variant: ButtonVariant): React.CSSProperties => {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--gradient)',
        boxShadow: '0 8px 20px -4px var(--color-primary-shadow)'
      };
    case 'secondary':
      return {
        borderColor: 'var(--color-primary)',
        color: 'var(--color-primary)',
        backgroundColor: 'transparent'
      };
    case 'ghost':
      return {
        color: 'var(--color-text-muted)',
        backgroundColor: 'transparent'
      };
    default:
      return {};
  }
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      className={`
        inline-flex items-center justify-center font-semibold
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        disabled:hover:translate-y-0
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      style={getButtonStyles(variant)}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </motion.button>
  );
};

export default Button;
