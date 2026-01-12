/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
    },
  },
  plugins: [],
  darkMode: 'class',
};
