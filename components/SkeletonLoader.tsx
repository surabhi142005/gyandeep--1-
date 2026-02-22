import React from 'react';

/* ─── Skeleton Loader System ─────────────────────────────────────────────────
 * A set of shimmer-based placeholder components used while real content loads.
 * Follows the Gyandeep 8px spacing grid and the design token system.
 * Respects `prefers-reduced-motion` via CSS.
 * ────────────────────────────────────────────────────────────────────────── */

interface SkeletonProps {
    /** Width — CSS value or Tailwind class (default: "100%") */
    width?: string;
    /** Height — CSS value or Tailwind class (default: "1rem") */
    height?: string;
    /** Fully round (circle / avatar) */
    circle?: boolean;
    /** Extra CSS classes */
    className?: string;
}

/** Base skeleton shimmer block */
export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = '1rem',
    circle = false,
    className = '',
}) => (
    <div
        aria-hidden="true"
        className={`gd-skeleton ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`}
        style={{ width, height }}
    />
);

/** Skeleton for a single line of text */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
    lines = 3,
    className = '',
}) => (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                height="0.875rem"
                width={i === lines - 1 ? '60%' : '100%'}
            />
        ))}
    </div>
);

/** Skeleton for a stat/metric card */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div
        className={`bg-white/80 rounded-2xl p-6 space-y-4 shadow-sm ${className}`}
        aria-hidden="true"
    >
        <div className="flex items-center gap-3">
            <Skeleton circle width="2.5rem" height="2.5rem" />
            <Skeleton height="1rem" width="50%" />
        </div>
        <Skeleton height="2rem" width="40%" />
        <SkeletonText lines={2} />
    </div>
);

/** Skeleton for a user/avatar row in a list */
export const SkeletonListItem: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div
        className={`flex items-center gap-4 p-4 bg-white/60 rounded-xl ${className}`}
        aria-hidden="true"
    >
        <Skeleton circle width="2.5rem" height="2.5rem" />
        <div className="flex-1 space-y-2">
            <Skeleton height="0.875rem" width="45%" />
            <Skeleton height="0.75rem" width="70%" />
        </div>
        <Skeleton height="1.5rem" width="4rem" className="rounded-full" />
    </div>
);

/** Skeleton for a chart / graph area */
export const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div
        className={`bg-white/80 rounded-2xl p-6 ${className}`}
        aria-hidden="true"
    >
        <Skeleton height="1rem" width="30%" className="mb-4" />
        <div className="flex items-end gap-2 h-40">
            {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
                <Skeleton key={i} height={`${h}%`} width="100%" className="flex-1" />
            ))}
        </div>
    </div>
);

/** Full dashboard skeleton — used as Suspense fallback */
export const SkeletonDashboard: React.FC = () => (
    <div className="min-h-screen p-4 md:p-8 space-y-6 max-w-7xl mx-auto" role="status" aria-label="Loading dashboard">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="space-y-2">
                <Skeleton height="1.75rem" width="16rem" />
                <Skeleton height="0.875rem" width="10rem" />
            </div>
            <div className="flex gap-3">
                <Skeleton height="2.5rem" width="6rem" className="rounded-xl" />
                <Skeleton circle width="2.5rem" height="2.5rem" />
            </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <SkeletonChart />
            </div>
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonListItem key={i} />
                ))}
            </div>
        </div>

        {/* Screen reader only text */}
        <span className="sr-only">Loading, please wait…</span>
    </div>
);

export default Skeleton;
