/**
 * components/ui/Skeletons.tsx
 * Loading skeleton components for data-heavy components
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl',
  };

  const style: React.CSSProperties = {
    background: 'linear-gradient(90deg, var(--color-border) 25%, var(--color-surface) 50%, var(--color-border) 75%)',
    backgroundSize: '200% 100%',
    animation: 'gd-shimmer 1.8s ease-in-out infinite',
  };
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={variantClasses[variant]}
      style={style}
      aria-hidden="true"
    />
  );
};

export const SkeletonGroup: React.FC<{ count?: number; className?: string }> = ({ 
  count = 3, 
  className = '' 
}) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} variant="text" className="w-full" />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="bg-[var(--color-surface)] rounded-xl shadow p-4 space-y-3 border border-[var(--color-border)]">
    <Skeleton variant="text" width="60%" height={20} />
    <SkeletonGroup count={lines} />
    <div className="flex gap-2 pt-2">
      <Skeleton variant="rectangular" width={80} height={32} />
      <Skeleton variant="rectangular" width={80} height={32} />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => (
  <div className="bg-[var(--color-surface)] rounded-xl shadow overflow-hidden border border-[var(--color-border)]">
    <div className="border-b border-[var(--color-border)] p-4">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" height={16} className="flex-1" />
        ))}
      </div>
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="border-b border-[var(--color-border)] p-4 last:border-0">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" height={14} className="flex-1" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonDashboard: React.FC = () => (
  <div className="space-y-6 p-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <SkeletonCard key={i} />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton variant="card" height={300} />
      <Skeleton variant="card" height={300} />
    </div>
  </div>
);

export const SkeletonUserCard: React.FC = () => (
  <div className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-lg shadow border border-[var(--color-border)]">
    <Skeleton variant="circular" width={48} height={48} />
    <div className="flex-1 space-y-2">
      <Skeleton variant="text" width="60%" height={16} />
      <Skeleton variant="text" width="40%" height={12} />
    </div>
    <Skeleton variant="rectangular" width={60} height={32} />
  </div>
);

export const SkeletonChart: React.FC<{ height?: number }> = ({ height = 200 }) => (
  <div className="bg-[var(--color-surface)] rounded-xl shadow p-4 border border-[var(--color-border)]">
    <Skeleton variant="text" width="30%" height={20} className="mb-4" />
    <Skeleton variant="rectangular" height={height} className="w-full" />
  </div>
);

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: items }).map((_, i) => (
      <SkeletonUserCard key={i} />
    ))}
  </div>
);

export const SkeletonAttendance: React.FC = () => (
  <div className="grid grid-cols-5 gap-2">
    {Array.from({ length: 30 }).map((_, i) => (
      <Skeleton key={i} variant="rectangular" height={40} className="rounded" />
    ))}
  </div>
);

/* ─── Progress Bar Component ─────────────────────────────────────────────── */

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  className = ''
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const heightMap = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  return (
    <div className={`w-full ${className}`}>
      <div 
        className={`w-full ${heightMap[size]} rounded-full overflow-hidden`}
        style={{ backgroundColor: 'var(--color-primary-10)' }}
      >
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
          style={{ 
            width: `${percentage}%`,
            background: 'var(--gradient)'
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              animation: 'shimmer 2s infinite'
            }}
          />
        </div>
      </div>
      {showLabel && (
        <p className="text-xs mt-1 font-medium text-right" style={{ color: 'var(--color-text-muted)' }}>
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
};

/* ─── XP Progress Bar ──────────────────────────────────────────────────── */

interface XPProgressBarProps {
  currentXP: number;
  xpForNextLevel: number;
  level: number;
}

export const XPProgressBar: React.FC<XPProgressBarProps> = ({
  currentXP,
  xpForNextLevel,
  level
}) => {
  const xpInCurrentLevel = currentXP % xpForNextLevel;
  const percentage = (xpInCurrentLevel / xpForNextLevel) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
          Level {level}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {xpInCurrentLevel} / {xpForNextLevel} XP
        </span>
      </div>
      <div 
        className="w-full h-2.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-primary-10)' }}
      >
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
          style={{ 
            width: `${percentage}%`,
            background: 'var(--gradient)'
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              animation: 'shimmer 2s infinite'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Skeleton;
