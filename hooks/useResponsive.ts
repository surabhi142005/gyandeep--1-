/**
 * hooks/useResponsive.ts
 * Responsive design hook for mobile detection
 */

import { useState, useEffect } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ResponsiveState {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
}

const breakpointValues: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

function getBreakpoint(width: number): Breakpoint {
  if (width >= breakpointValues['2xl']) return '2xl';
  if (width >= breakpointValues.xl) return 'xl';
  if (width >= breakpointValues.lg) return 'lg';
  if (width >= breakpointValues.md) return 'md';
  if (width >= breakpointValues.sm) return 'sm';
  return 'xs';
}

function getOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') return 'portrait';
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    breakpoint: getBreakpoint(typeof window !== 'undefined' ? window.innerWidth : 1200),
    isMobile: typeof window !== 'undefined' ? window.innerWidth < breakpointValues.md : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth >= breakpointValues.md && window.innerWidth < breakpointValues.lg : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= breakpointValues.lg : true,
    isTouch: isTouchDevice(),
    orientation: getOrientation(),
  }));

  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const breakpoint = getBreakpoint(width);

        setState({
          width,
          height,
          breakpoint,
          isMobile: width < breakpointValues.md,
          isTablet: width >= breakpointValues.md && width < breakpointValues.lg,
          isDesktop: width >= breakpointValues.lg,
          isTouch: isTouchDevice(),
          orientation: getOrientation(),
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  return state;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    const updateMatches = () => setMatches(media.matches);
    updateMatches();

    media.addEventListener('change', updateMatches);
    return () => media.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
}

export function useMobile(): boolean {
  return useResponsive().isMobile;
}

export function useTablet(): boolean {
  return useResponsive().isTablet;
}

export function useDesktop(): boolean {
  return useResponsive().isDesktop;
}

export function useIsTouch(): boolean {
  return useResponsive().isTouch;
}

export function useOrientation(): 'portrait' | 'landscape' {
  return useResponsive().orientation;
}

export const breakpoints = breakpointValues;

export default useResponsive;
