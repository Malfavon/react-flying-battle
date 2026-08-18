/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        sky: {
          light: '#a0e7ff',
          deep: '#3b82f6',
        },
        ocean: {
          surface: '#1e3a8a',
          depth: '#0f172a',
        },
        hud: {
          bg: 'rgba(15, 23, 42, 0.75)',
          border: 'rgba(56, 189, 248, 0.4)',
          text: '#38bdf8',
          accent: '#06b6d4',
          warning: '#f59e0b',
          danger: '#ef4444',
          success: '#10b981',
        }
      }
    },
  },
  plugins: [],
}
