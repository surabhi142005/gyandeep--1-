import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  glass?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  featured?: boolean;
  onClick?: () => void;
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
  xl: 'p-10',
};

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  glow = false,
  glass = false,
  featured = false,
  padding = 'md',
  onClick,
}) => {
  const baseClasses = `
    rounded-2xl transition-all duration-300 relative overflow-hidden
    ${glass
      ? 'bg-white/60 backdrop-blur-xl border-white/20'
      : featured
        ? 'text-white border-none'
        : 'bg-[var(--color-surface)] border border-[var(--color-border)]'
    }
    ${hover ? 'gd-card-hover cursor-pointer' : 'shadow-sm'}
    ${paddingClasses[padding]}
    ${className}
  `;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={baseClasses}
      onClick={onClick}
      style={featured ? {
        background: 'var(--gradient)'
      } : glow ? {
        boxShadow: '0 0 30px var(--color-primary-glow)'
      } : {}}
    >
      {!featured && <div className="absolute top-0 left-0 right-0 h-[3px] bg-theme-gradient" />}
      {children}
    </motion.div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-bold text-[var(--color-primary)] ${className}`}>{children}</h3>
);

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{children}</p>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-[var(--color-border)] ${className}`}>{children}</div>
);

export default Card;
