/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        spotify: {
          green: '#1DB954',
          'green-light': '#1ED760',
          'green-dark': '#169C46',
          black: '#000000',
          'dark-gray': '#0A0A0A',
          'medium-gray': '#141414',
          gray: '#1A1A1A',
          'light-gray': '#282828',
          'text-gray': '#B3B3B3',
          'text-light': '#E5E5E5',
          white: '#FFFFFF',
          'accent-blue': '#2563EB',
          'accent-purple': '#7C3AED',
          'warning': '#F59E0B',
          'error': '#EF4444',
          'border': '#2A2A2A'
        }
      },
      fontFamily: {
        'spotify': ['Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        'none': '0px',
        'xs': '2px',
        'sm': '3px',
        'md': '4px',
        'lg': '6px',
        'xl': '8px'
      },
      boxShadow: {
        'minimal': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'card': '0 2px 4px 0 rgba(0, 0, 0, 0.4)',
        'elevated': '0 4px 8px 0 rgba(0, 0, 0, 0.5)',
        'player': '0 -2px 12px rgba(0, 0, 0, 0.6)'
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem'
      }
    },
  },
  plugins: [],
};