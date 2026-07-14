import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
          50: '#F8FAFC',
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#1E1B4B',
        },
        amber: {
          400: '#FCD34D',
          500: '#F59E0B',
          700: '#B45309',
          900: '#78350F',
        },
        success: {
          light: '#DCFCE7',
          DEFAULT: '#16A34A',
          dark: '#15803D',
        },
        danger: {
          light: '#FEE2E2',
          lighter: '#FECACA',
          DEFAULT: '#DC2626',
          dark: '#B91C1C',
        },
      },
      borderRadius: {
        xl2: '18px',
      },
      boxShadow: {
        card: '0 14px 30px rgba(15,23,42,0.1)',
        'card-lg': '0 16px 40px rgba(15,23,42,0.1)',
        brand: '0 8px 20px rgba(79,70,229,0.3)',
        'brand-sm': '0 8px 18px rgba(79,70,229,0.28)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.35s ease',
      },
    },
  },
  plugins: [],
};

export default config;
