export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#F3F7E7',
          100: '#E4EDB3',
          200: '#D6E37E',
          300: '#C7D94A',
          400: '#8BBB3F',
          500: '#4F9D33',
          600: '#3E8429',
          700: '#2D6B1F',
          800: '#1C5215',
          900: '#0B390B',
        },
      },
    },
  },
  plugins: [],
};
