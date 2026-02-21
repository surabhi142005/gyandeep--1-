import React from 'react';

interface GradientTextProps {
    children?: React.ReactNode;
    text?: string;
    className?: string;
    speed?: number; // seconds for animation loop
    colors?: string[];
}

const GradientText: React.FC<GradientTextProps> = ({ children, text, className = '', speed = 6, colors = ['#6366f1', '#8b5cf6', '#06b6d4'] }) => {
    const gradient = `linear-gradient(90deg, ${colors.join(', ')})`;
    const style: React.CSSProperties = {
        background: gradient,
        backgroundSize: '200% 200%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        animation: `gradientShift ${speed}s linear infinite`
    };

    return (
        <>
            <style>{`
                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
            <span style={style} className={className}>
                {text || children}
            </span>
        </>
    );
};

export default GradientText;
