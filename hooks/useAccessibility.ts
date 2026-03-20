/**
 * hooks/useAccessibility.ts
 * Accessibility utilities and keyboard navigation
 */

import { useEffect, useCallback, useRef } from 'react';

export interface FocusTrapOptions {
  enabled?: boolean;
  onEscape?: () => void;
}

export function useFocusTrap(options: FocusTrapOptions = {}) {
  const { enabled = true, onEscape } = options;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelectors);
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    const firstFocusable = container.querySelector<HTMLElement>(focusableSelectors);
    firstFocusable?.focus();

    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onEscape]);

  return containerRef;
}

export function useKeyboardNavigation(items: string[], options: {
  onSelect?: (item: string) => void;
  onEscape?: () => void;
}) {
  const { onSelect, onEscape } = options;

  const handleKeyDown = useCallback((e: KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        newIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.(items[currentIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        onEscape?.();
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = items.length - 1;
        break;
    }

    return newIndex;
  }, [items, onSelect, onEscape]);

  return { handleKeyDown };
}

export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const el = document.createElement('div');
  el.setAttribute('aria-live', priority);
  el.setAttribute('aria-atomic', 'true');
  el.className = 'sr-only';
  el.textContent = message;
  document.body.appendChild(el);
  
  setTimeout(() => {
    document.body.removeChild(el);
  }, 1000);
}

export function getAriaLabel(htmlId: string, label: string, description?: string): string {
  if (!description) return label;
  return `${label}: ${description}`;
}

export function skipLinkStyle(): string {
  return `
    .skip-link {
      position: absolute;
      top: -100px;
      left: 0;
      background: #4f46e5;
      color: white;
      padding: 8px 16px;
      z-index: 99999;
      transition: top 0.2s;
    }
    .skip-link:focus {
      top: 0;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `;
}

export function useSkipLink(targetId: string) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView();
    }
  }, [targetId]);

  return { handleClick };
}

export function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}
