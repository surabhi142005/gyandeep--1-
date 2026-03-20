import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  glass?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
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
  padding = 'md',
  onClick,
}) => {
  const baseClasses = `
    rounded-2xl border transition-all duration-300 relative overflow-hidden
    ${glass
      ? 'bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-white/20'
      : 'bg-app-surface border-gray-100 dark:border-gray-800 shadow-sm'
    }
    ${hover ? 'hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 cursor-pointer hover:shadow-primary/10' : ''}
    ${glow ? 'shadow-glow hover:shadow-glow-lg' : ''}
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
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-theme-gradient" />
      {children}
    </motion.div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-bold text-gray-900 ${className}`}>{children}</h3>
);

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-500 mt-1 ${className}`}>{children}</p>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export default Card;
