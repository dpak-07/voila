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
          emerald: '#ffffff',
          glow: '#e4e4e7',
          crimson: '#f43f5e',
          amber: '#f59e0b',
          cyan: '#d4d4d8',
          purple: '#a1a1aa',
        },
        confidence: {
          measured: '#ffffff',
          estimated: '#f59e0b',
          nodata: '#71717a',
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        'signal-emerald': '0 2px 8px 0 rgba(0, 0, 0, 0.5)',
        'signal-crimson': '0 2px 8px 0 rgba(0, 0, 0, 0.5)',
        'signal-amber': '0 2px 8px 0 rgba(0, 0, 0, 0.5)',
        'signal-cyan': '0 2px 8px 0 rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
