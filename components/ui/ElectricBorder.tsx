import React, { useRef, useEffect } from 'react';
import '../../styles/ElectricBorder.css';

interface ElectricBorderProps {
  children: React.ReactNode;
  color?: string;
  speed?: number;
  className?: string;
}

const ElectricBorder: React.FC<ElectricBorderProps> = ({
  children,
  color = '#6366f1',
  speed = 3,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    const draw = () => {
      if (!ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const perimeter = 2 * (w + h);
      const numParticles = 20;

      for (let i = 0; i < numParticles; i++) {
        const t = ((time * speed * 0.01 + i / numParticles) % 1) * perimeter;
        let x: number, y: number;

        if (t < w) {
          x = t; y = 0;
        } else if (t < w + h) {
          x = w; y = t - w;
        } else if (t < 2 * w + h) {
          x = w - (t - w - h); y = h;
        } else {
          x = 0; y = h - (t - 2 * w - h);
        }

        const alpha = 0.3 + 0.7 * Math.sin((time * 0.05 + i) * Math.PI);
        const size = 2 + Math.sin(time * 0.03 + i) * 1.5;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(x, y, size * 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * 0.15;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      time++;
      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animationId);
      ro.disconnect();
    };
  }, [color, speed]);

  return (
    <div ref={containerRef} className={`electric-border-container ${className}`}>
      <canvas ref={canvasRef} className="electric-border-canvas" />
      <div className="electric-border-content">{children}</div>
    </div>
  );
};

export default ElectricBorder;
