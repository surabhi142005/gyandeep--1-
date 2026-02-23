import React from 'react';
import { motion } from 'framer-motion';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'xp' | 'coin' | 'streak';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: string;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  xp: 'bg-gradient-to-r from-purple-100 to-indigo-100 text-indigo-700 border-indigo-200',
  coin: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-700 border-amber-200',
  streak: 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 border-orange-200',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
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
