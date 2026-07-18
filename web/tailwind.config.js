export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Epilogue', 'Montserrat', 'sans-serif'],
        serif: ['Cinzel', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50: '#f6efe0',
          100: '#ebddc1',
          200: '#dcb790',
          300: '#c59560',
          400: '#b67945',
          500: '#d09d61',
          600: '#a17240',
          700: '#7b5130',
          800: '#5d3c24',
          900: '#3b2618',
        },
      },
    },
  },
  plugins: [],
};
