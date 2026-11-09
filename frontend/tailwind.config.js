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
        primary: {
          DEFAULT: '#ffb067',
          hover: '#ffa048',
          foreground: '#4c2700',
          container: '#ffb067',
          fixed: '#ffd5b3',
          dim: '#e29750'
        },
        surface: {
          DEFAULT: '#090e1b',
          dim: '#0b101f',
          container: {
            lowest: '#090e1b',
            low: '#161b29',
            DEFAULT: '#1a1f2d',
            high: '#222838',
            highest: '#2e3549'
          },
          variant: '#1c2237'
        },
        outline: {
          DEFAULT: '#283046',
          variant: '#323b52',
          subtle: '#1f2638'
        },
        arthivex: {
          dark: '#090e1b',
          card: '#161b29',
          border: '#283046',
          peach: '#ffb067',
          blue: '#38bdf8',
          emerald: '#10b981',
          danger: '#f87171'
        },
        finguard: {
          dark: '#090e1b',
          card: '#161b29',
          border: '#283046',
          peach: '#ffb067',
          blue: '#38bdf8',
          emerald: '#10b981',
          danger: '#f87171'
        },
        theme: {
          app: 'var(--bg-app)',
          card: 'var(--bg-card)',
          elevated: 'var(--bg-elevated)',
          hover: 'var(--bg-hover)',
          border: 'var(--border-subtle)',
          'border-strong': 'var(--border-strong)',
          header: 'var(--bg-header)',
          sidebar: 'var(--bg-sidebar)',
          chip: 'var(--bg-chip)',
          text: 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-muted': 'var(--text-muted)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        'glow-peach': '0 0 24px -4px rgba(255, 176, 103, 0.25)',
        'glow-peach-sm': '0 0 12px -2px rgba(255, 176, 103, 0.20)',
        'glow-emerald': '0 0 20px -4px rgba(16, 185, 129, 0.25)',
        'glow-blue': '0 0 20px -4px rgba(56, 189, 248, 0.25)',
        'inner-border': 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
      }
    },
  },
  plugins: [],
}

