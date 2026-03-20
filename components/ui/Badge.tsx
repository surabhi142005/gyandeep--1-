import React from 'react';
import { motion } from 'framer-motion';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'xp' | 'coin' | 'streak';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: string;
  animated?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  xp: 'bg-theme-gradient text-white border-none shadow-sm',
  coin: 'bg-theme-gradient text-white border-none shadow-sm',
  streak: 'bg-theme-gradient text-white border-none shadow-sm',
};

const sizeClasses = {
  xs: 'px-1.5 py-0.5 text-[9px]',
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
  xl: 'px-4 py-2 text-base',
};

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  icon,
  animated = false,
  size = 'md',
  className = '',
}) => {
  if (animated) {
    return (
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring' as const, stiffness: 400, damping: 15 }}
        className={`
          inline-flex items-center gap-1 font-semibold rounded-full border
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
      >
        {icon && <span>{icon}</span>}
        {children}
      </motion.span>
    );
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-semibold rounded-full border
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
