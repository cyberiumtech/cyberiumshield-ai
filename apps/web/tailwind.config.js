import scrollbar from 'tailwind-scrollbar';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  colors: {
  chrome: 'var(--bg-nav)',      // or a dedicated --bg-sidebar if you want it darker
  line: 'var(--line)',
  },
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-canvas) / <alpha-value>)',
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        chrome: 'rgb(var(--color-chrome) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        field: 'rgb(var(--color-field) / <alpha-value>)',
        fg: 'rgb(var(--color-fg) / <alpha-value>)',
        'fg-2': 'rgb(var(--color-fg-2) / <alpha-value>)',
        'fg-3': 'rgb(var(--color-fg-3) / <alpha-value>)',
        'fg-4': 'rgb(var(--color-fg-4) / <alpha-value>)',
        'fg-5': 'rgb(var(--color-fg-5) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        'line-2': 'rgb(var(--color-line-2) / <alpha-value>)',
        'line-3': 'rgb(var(--color-line-3) / <alpha-value>)',
        tint: 'rgb(var(--color-tint) / <alpha-value>)',
        'tint-2': 'rgb(var(--color-tint-2) / <alpha-value>)',
        'tint-3': 'rgb(var(--color-tint-3) / <alpha-value>)',
        'chart-tooltip': 'rgb(var(--color-chart-tooltip) / <alpha-value>)',
        'chart-grid': 'rgb(var(--color-chart-grid) / <alpha-value>)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [
    scrollbar,
  ],
}
