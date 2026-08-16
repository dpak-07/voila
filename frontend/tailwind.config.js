/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: {
          950: '#09090b',
          900: '#121215',
          850: '#18181b',
          800: '#202024',
          700: '#27272a',
          600: '#3f3f46',
        },
        signal: {
          emerald: '#10b981',
          glow: '#6366f1',
          crimson: '#f43f5e',
          amber: '#f59e0b',
          cyan: '#0284c7',
          purple: '#8b5cf6',
        },
        confidence: {
          measured: '#10b981',
          estimated: '#f59e0b',
          nodata: '#64748b',
        }
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'signal-emerald': '0 2px 8px 0 rgba(16, 185, 129, 0.25)',
        'signal-crimson': '0 2px 8px 0 rgba(244, 63, 94, 0.25)',
        'signal-amber': '0 2px 8px 0 rgba(245, 158, 11, 0.25)',
        'signal-cyan': '0 2px 8px 0 rgba(2, 132, 199, 0.25)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
