/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{ts,tsx}',
    '!./node_modules/**',
    '!./server/**',
  ],
  darkMode: ['selector', '[data-dark-mode="1"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        'app-bg': 'var(--color-bg)',
        'app-surface': 'var(--color-surface)',
        'app-text': 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        border: 'var(--color-border)',
        sidebar: {
          bg: 'var(--color-sidebar-bg)',
          text: 'var(--color-sidebar-text)',
          'text-active': 'var(--color-sidebar-text-active)',
          hover: 'var(--color-sidebar-hover)',
          active: 'var(--color-sidebar-active)',
        },
        brand: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
      },
      backgroundImage: {
        'theme-gradient': 'var(--gradient)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow': '0 0 20px var(--color-primary-glow)',
        'glow-lg': '0 0 40px var(--color-primary-glow)',
        'inner-glow': 'inset 0 1px 4px 0 var(--color-primary-glow)',
        'theme': '0 4px 20px -2px var(--color-primary-shadow)',
        'theme-lg': '0 10px 40px -4px var(--color-primary-shadow)',
        'primary': '0 8px 30px -8px var(--color-primary-shadow)',
        'primary-lg': '0 20px 60px -12px var(--color-primary-shadow)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-down': 'slideDown 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'spin-slow': 'spin 3s linear infinite',
        'confetti': 'confetti 1s ease-out forwards',
        'streak-fire': 'streakFire 0.5s ease-out forwards',
        'xp-fly': 'xpFly 1s ease-out forwards',
        'coin-spin': 'coinSpin 0.6s ease-out forwards',
        'shake': 'shake 0.5s ease-in-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'progress-fill': 'progressFill 1s ease-out forwards',
        'count-up': 'countUp 0.8s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-200px) rotate(720deg)', opacity: '0' },
        },
        streakFire: {
          '0%': { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '50%': { transform: 'scale(1.3) rotate(5deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        xpFly: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-60px) scale(1.5)', opacity: '0' },
        },
        coinSpin: {
          '0%': { transform: 'rotateY(0deg) scale(0)' },
          '50%': { transform: 'rotateY(180deg) scale(1.2)' },
          '100%': { transform: 'rotateY(360deg) scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)' },
        },
        progressFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width, 100%)' },
        },
        countUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionDuration: {
        '0': '0ms',
      },
    },
  },
  plugins: [],
};
