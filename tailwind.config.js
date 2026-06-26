/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#4F46E5',
          50: '#f0efff',
          100: '#e4e2ff',
          200: '#cdc9ff',
          300: '#aba4ff',
          400: '#8076fb',
          500: '#4F46E5',
          600: '#4338ca',
          700: '#3730a3',
        },
        green: {
          DEFAULT: '#16a86a',
          light: '#e7f6ee',
          text: '#138a5a',
        },
        amber: {
          DEFAULT: '#f59e0b',
          light: '#fff4e0',
          text: '#c07a16',
        },
      },
    },
  },
  plugins: [],
}
