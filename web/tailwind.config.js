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
          50: '#EDF6EA',
          100: '#D3EACB',
          200: '#A8D69C',
          300: '#8BC34A',
          400: '#5FA045',
          500: '#2F8132',
          600: '#256A28',
          700: '#1E5B22',
          800: '#17441A',
          900: '#0F2D11',
        },
      },
    },
  },
  plugins: [],
};
