import React, { useRef, useEffect } from 'react';

interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    threshold?: number;
    from?: 'left' | 'right' | 'bottom' | 'top';
    distance?: string;
    duration?: number; // seconds
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({ children, className = '', threshold = 0.15, from = 'bottom', distance = '30px', duration = 0.7 }) => {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-visible');
                }
            });
        }, { threshold });

        observer.observe(el);

        return () => observer.disconnect();
    }, [threshold]);

    const transformMap: Record<string, string> = {
        left: `translateX(-${distance})`,
        right: `translateX(${distance})`,
        bottom: `translateY(${distance})`,
        top: `translateY(-${distance})`
    };

    return (
        <div ref={ref} className={`reveal ${className}`} style={{ transform: transformMap[from], opacity: 0, transition: `transform ${duration}s ease, opacity ${duration}s ease` }}>
            <style>{`
                .reveal-visible { transform: none !important; opacity: 1 !important; }
            `}</style>
            {children}
        </div>
    );
};

export default ScrollReveal;
