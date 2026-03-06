import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#0A84FF',
          hover: '#2194FF',
          subtle: 'rgba(10,132,255,0.12)',
        },
        titanium: {
          50: '#F5F5F7',
          100: '#E5E5EA',
          200: '#C7C7CC',
          300: '#AEAEB2',
          400: '#8E8E93',
          500: '#636366',
          600: '#48484A',
          700: '#3A3A3C',
          800: '#2C2C2E',
          900: '#1C1C1E',
          950: '#111111',
        },
        success: '#32D74B',
        warning: '#FF9F0A',
        danger: '#FF453A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        wide: '0.08em',
        wider: '0.12em',
        widest: '0.2em',
      },
      borderRadius: {
        '4': '4px',
        '6': '6px',
        '8': '8px',
        '10': '10px',
        '12': '12px',
        '14': '14px',
        '16': '16px',
        '20': '20px',
      },
      boxShadow: {
        'card-dark': '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)',
        'card-light': '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
        'accent-glow': '0 0 20px rgba(10,132,255,0.3)',
        'float': '0 32px 80px rgba(0,0,0,0.6)',
      },
      animation: {
        'infinite-scroll': 'infinite-scroll 35s linear infinite',
        'infinite-scroll-reverse': 'infinite-scroll-reverse 45s linear infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'waveform': 'waveform 0.8s ease-in-out infinite alternate',
      },
      keyframes: {
        'infinite-scroll': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'infinite-scroll-reverse': {
          from: { transform: 'translateX(-50%)' },
          to: { transform: 'translateX(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.85)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'waveform': {
          '0%': { height: '4px' },
          '100%': { height: '20px' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
