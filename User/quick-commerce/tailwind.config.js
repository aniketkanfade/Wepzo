/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          500: '#f4510b',
          600: '#e34305',
          700: '#c93605',
          900: '#7c2d12',
        },
      },
    },
  },
  plugins: [],
};
