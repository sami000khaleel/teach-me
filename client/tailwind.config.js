/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',

  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        ink: {
          950: '#070b17',
          900: '#0b1020',
          800: '#111833',
          700: '#1a2244',
          600: '#252f5a',
        },
        // legacy tokens (still referenced by a few commented / old classes)
        primaryDark: '#4f46e5',
        primaryLight: '#c7d2fe',
        primaryDarkText: '#e2e8f0',
        primarylightText: '#1e1b4b',
        primaryDarkBackground: '#111833',
        primaryLightBackground: '#f5f6fb',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,.04), 0 10px 30px -12px rgba(16,24,40,.12)',
        glow: '0 10px 28px -10px rgba(79,70,229,.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s ease-out both',
      },
    },
  },

  plugins: [],
}
