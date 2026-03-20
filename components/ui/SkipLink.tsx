/**
 * components/ui/SkipLink.tsx
 * Accessibility skip link component
 */

import React from 'react';

interface SkipLinkProps {
  targetId: string;
  children?: React.ReactNode;
}

const SkipLink: React.FC<SkipLinkProps> = ({ targetId, children = 'Skip to main content' }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="skip-link"
      style={{
        position: 'absolute',
        top: '-100px',
        left: '0',
        background: 'var(--color-primary, #4f46e5)',
        color: 'white',
        padding: '12px 24px',
        zIndex: 99999,
        transition: 'top 0.2s ease-out',
        textDecoration: 'none',
        fontWeight: 600,
        borderRadius: '0 0 8px 0',
      }}
      onFocus={(e) => {
        e.currentTarget.style.top = '0';
      }}
      onBlur={(e) => {
        e.currentTarget.style.top = '-100px';
      }}
    >
      {children}
    </a>
  );
};

export default SkipLink;
