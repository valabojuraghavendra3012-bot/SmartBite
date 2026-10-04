/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#214b3b',
        leaf: '#39795c',
        moss: '#91a98b',
        cream: '#f7f8f3',
        ink: '#24352d',
        muted: '#77847d',
        line: '#e7ebe4',
        sun: '#f2be68',
        coral: '#e78c72',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 12px 40px rgba(35, 62, 47, 0.07)',
        card: '0 5px 20px rgba(35, 62, 47, 0.055)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
