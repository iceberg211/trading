/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        panel: '6px',
        pill: '9999px',
      },
      zIndex: {
        dropdown: '40',
        tooltip: '50',
        modal: '60',
      },
      fontSize: {
        xxs: '11px',
      },
        colors: {
        // 交易方向色
        up: {
          DEFAULT: '#0ECB81', // Binance Green
          light: '#36D996',
          dark: '#0B9C63',
          bg: 'rgba(14, 203, 129, 0.12)',
        },
        down: {
          DEFAULT: '#F6465D', // Binance Red
          light: '#FF6E81',
          dark: '#C9263D',
          bg: 'rgba(246, 70, 93, 0.12)',
        },
        // 专业的深色背景体系
        bg: {
          DEFAULT: '#161A1E', // Main App Background
          card: '#1E2329',    // Component Background
          hover: '#2A2F37',   // Hover State
          input: '#2B3139',   // Input Fields
          panel: '#1B2026',   // Secondary panel background
          soft: '#20252C',    // Tertiary panel background
        },
        // 文本层级
        text: {
          primary: '#EAECEF',
          secondary: '#848E9C',
          tertiary: '#5E6673',
          inverse: '#1E2329',
        },
        // 边框
        line: {
          DEFAULT: '#2B3139',
          light: '#363C45',
          dark: '#232830',
        },
        // 强调色
        accent: {
          DEFAULT: '#FCD535', // Binance Yellow
          hover: '#F0B90B',
          soft: 'rgba(252, 213, 53, 0.16)',
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
