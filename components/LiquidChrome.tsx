import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import React, { useEffect, useRef } from 'react';
import './LiquidChrome.css';

interface LiquidChromeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  color?: [number, number, number];
  speed?: number;
  amplitude?: number;
  mouseReact?: boolean;
}

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

// Liquid chrome / metallic reflection effect
float liquid(vec2 p, float t) {
  float a = 0.0;
  for (float i = 1.0; i <= 6.0; i++) {
    float fi = i * 1.3;
    a += sin(p.x * fi + t * 0.7 * uSpeed + sin(p.y * fi * 0.5 + t * 0.3 * uSpeed) * 2.0) / fi;
    a += cos(p.y * fi * 0.9 + t * 0.5 * uSpeed + cos(p.x * fi * 0.7 + t * 0.4 * uSpeed) * 1.5) / fi;
  }
  return a;
}

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv * 2.0 - 1.0) * uResolution.xy / mr;

  // Mouse influence
  uv += (uMouse - vec2(0.5)) * uAmplitude * 2.0;

  float t = uTime;

  // Layered liquid distortion
  float n1 = liquid(uv * 1.0, t);
  float n2 = liquid(uv * 2.0 + vec2(3.7, 1.2), t * 0.8);
  float n3 = liquid(uv * 0.5 + vec2(-1.3, 2.8), t * 1.2);

  float combined = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

  // Chrome reflection: sharp highlights and dark valleys
  float chrome = smoothstep(-0.5, 0.5, combined);
  float highlight = pow(max(0.0, combined), 3.0) * 1.5;

  // Base metallic color
  vec3 baseColor = uColor * (0.3 + chrome * 0.7);

  // Add bright specular highlights
  vec3 specular = vec3(1.0) * highlight * 0.6;

  // Add color variation based on angle (like real chrome)
  vec3 tint = vec3(
    sin(combined * 3.0 + t * 0.2) * 0.1,
    sin(combined * 3.0 + t * 0.2 + 2.094) * 0.1,
    sin(combined * 3.0 + t * 0.2 + 4.189) * 0.1
  );

  vec3 col = baseColor + specular + tint * uColor;

  // Subtle pulsing
  float pulse = sin(t * 0.6 * uSpeed) * 0.05 + 0.95;
  col *= pulse;

  // Vignette
  float vignette = 1.0 - 0.25 * length(vUv - 0.5);
  col *= vignette;

  // Clamp
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

const LiquidChrome: React.FC<LiquidChromeProps> = ({
  color = [0.58, 0.58, 0.58],
  speed = 1.0,
  amplitude = 0.1,
  mouseReact = true,
  ...rest
}) => {
  const ctnDom = useRef<HTMLDivElement | null>(null);
  const mousePos = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (!ctnDom.current) return;
    const ctn = ctnDom.current;
    const renderer = new Renderer();
    const gl = renderer.gl;
    gl.clearColor(1, 1, 1, 1);

    let program: Program | null = null;

    function resize() {
      const width = ctn.offsetWidth || window.innerWidth;
      const height = ctn.offsetHeight || window.innerHeight;
      renderer.setSize(width, height);
      if (program) {
        program.uniforms.uResolution.value = new Color(
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / gl.canvas.height
        );
      }
    }

    window.addEventListener('resize', resize, false);
    resize();

    const geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(color[0], color[1], color[2]) },
        uResolution: {
          value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height)
        },
        uMouse: { value: new Float32Array([mousePos.current.x, mousePos.current.y]) },
        uAmplitude: { value: amplitude },
        uSpeed: { value: speed }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });
    let animateId: number;

    const update = (t: number) => {
      animateId = requestAnimationFrame(update);
      if (program) {
        program.uniforms.uTime.value = t * 0.001;
      }
      renderer.render({ scene: mesh });
    };

    animateId = requestAnimationFrame(update);
    ctn.appendChild(gl.canvas);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = ctn.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      mousePos.current = { x, y };
      if (program) {
        const mouseUniform = program.uniforms.uMouse.value as Float32Array;
        mouseUniform[0] = x;
        mouseUniform[1] = y;
      }
    };

    if (mouseReact) {
      ctn.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      cancelAnimationFrame(animateId);
      window.removeEventListener('resize', resize);
      if (mouseReact) {
        ctn.removeEventListener('mousemove', handleMouseMove);
      }
      if (gl.canvas.parentElement === ctn) {
        ctn.removeChild(gl.canvas);
      }
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) {
        ext.loseContext();
      }
    };
  }, [color, speed, amplitude, mouseReact]);

  return <div ref={ctnDom} className="liquid-chrome-container" {...rest} />;
};

export default LiquidChrome;
