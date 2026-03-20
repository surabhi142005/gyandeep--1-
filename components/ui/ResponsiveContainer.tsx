/**
 * components/ui/ResponsiveContainer.tsx
 * Responsive container with adaptive layouts
 */

import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  desktopLayout?: 'grid' | 'flex' | 'stack';
  mobileLayout?: 'stack' | 'grid';
  tabletLayout?: 'grid' | 'flex' | 'stack';
  gap?: string;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  desktopLayout = 'grid',
  mobileLayout = 'stack',
  tabletLayout = 'grid',
  gap = 'gap-4',
}) => {
  const { isMobile, isTablet } = useResponsive();

  const getLayoutClass = () => {
    if (isMobile) {
      return mobileLayout === 'stack' ? 'flex flex-col' : 'grid grid-cols-1';
    }
    if (isTablet) {
      return tabletLayout === 'stack' ? 'flex flex-col' : 'grid grid-cols-2';
    }
    return desktopLayout === 'stack' ? 'flex flex-col' : 'grid grid-cols-3';
  };

  return (
    <div className={`${getLayoutClass()} ${gap} ${className}`}>
      {children}
    </div>
  );
};

interface ShowOnProps {
  children: React.ReactNode;
  onlyOn?: 'mobile' | 'tablet' | 'desktop';
  hideOn?: 'mobile' | 'tablet' | 'desktop';
}

export const ShowOn: React.FC<ShowOnProps> = ({ children, onlyOn, hideOn }) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const shouldShow = onlyOn
    ? (onlyOn === 'mobile' && isMobile) ||
      (onlyOn === 'tablet' && isTablet) ||
      (onlyOn === 'desktop' && isDesktop)
    : true;

  const shouldHide = hideOn
    ? (hideOn === 'mobile' && isMobile) ||
      (hideOn === 'tablet' && isTablet) ||
      (hideOn === 'desktop' && isDesktop)
    : false;

  if (!shouldShow || shouldHide) return null;
  return <>{children}</>;
};

export const MobileOnly: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`md:hidden ${className}`}>{children}</div>
);

export const DesktopOnly: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`hidden md:block ${className}`}>{children}</div>
);

export const TabletOnly: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`hidden lg:block ${className}`}>{children}</div>
);

export const TouchOnly: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  const { isTouch } = useResponsive();
  if (!isTouch) return null;
  return <div className={className}>{children}</div>;
};

export default ResponsiveContainer;
