/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        // 交易主题色（涨红跌绿 - 中国习惯）
        up: {
          DEFAULT: '#14b8a6', // 涨 - 绿色
          light: '#5eead4',
          dark: '#0f766e',
        },
        down: {
          DEFAULT: '#ef4444', // 跌 - 红色
          light: '#fca5a5',
          dark: '#b91c1c',
        },
        accent: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          soft: '#fde68a',
        },
        // 背景色
        bg: {
          primary: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#334155',
        },
        // 边框色
        border: {
          primary: '#334155',
          secondary: '#475569',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out',
        'rise-in': 'rise-in 0.7s ease-out',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
