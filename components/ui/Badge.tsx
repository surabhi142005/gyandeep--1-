import React from 'react';
import { motion } from 'framer-motion';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'xp' | 'coin' | 'streak' | 'primary' | 'secondary' | 'present' | 'absent';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  animated?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const getVariantStyles = (variant: BadgeVariant): React.CSSProperties => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: 'var(--color-primary-15)',
        color: 'var(--color-primary)',
        borderColor: 'var(--color-primary-15)'
      };
    case 'secondary':
      return {
        backgroundColor: 'var(--color-secondary-15)',
        color: 'var(--color-secondary)',
        borderColor: 'var(--color-secondary-15)'
      };
    case 'success':
    case 'present':
      return {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        color: '#16A34A',
        borderColor: 'rgba(34, 197, 94, 0.2)'
      };
    case 'warning':
      return {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        color: '#D97706',
        borderColor: 'rgba(245, 158, 11, 0.2)'
      };
    case 'danger':
    case 'absent':
      return {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        color: '#DC2626',
        borderColor: 'rgba(239, 68, 68, 0.2)'
      };
    case 'info':
      return {
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        color: '#0284C7',
        borderColor: 'rgba(14, 165, 233, 0.2)'
      };
    case 'xp':
    case 'coin':
    case 'streak':
      return {
        background: 'var(--gradient)',
        color: 'white',
        borderColor: 'transparent'
      };
    default:
      return {
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        borderColor: 'var(--color-border)'
      };
  }
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
  const baseClasses = `
    inline-flex items-center gap-1.5 font-semibold rounded-full border
    ${sizeClasses[size]}
    ${className}
  `;

  const badgeStyle = getVariantStyles(variant);

  if (animated) {
    return (
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring' as const, stiffness: 400, damping: 15 }}
        className={baseClasses}
        style={badgeStyle}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </motion.span>
    );
  }

  return (
    <span className={baseClasses} style={badgeStyle}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
